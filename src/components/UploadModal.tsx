
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

export function UploadModal() {
    const [files, setFiles] = useState<FileList | null>(null);
    const [uploading, setUploading] = useState(false);
    const [open, setOpen] = useState(false);
    const [isFolderMode, setIsFolderMode] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");

    // Use refs to reset inputs when switching modes
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(e.target.files);
        }
    };

    const uploadSingleFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("http://localhost:5003/api/upload-fits/", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Failed to upload ${file.name}`);
        }
        return data;
    };

    const handleUpload = async () => {
        if (!files || files.length === 0) {
            toast.error("Please select file(s) first");
            return;
        }

        setUploading(true);
        setProgress(0);

        // Filter for FITS files if in folder mode (client-side check)
        const validFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (f.name.toLowerCase().endsWith('.fits') || f.name.toLowerCase().endsWith('.fits.gz')) {
                validFiles.push(f);
            }
        }

        if (validFiles.length === 0) {
            toast.error("No valid .fits or .fits.gz files found.");
            setUploading(false);
            return;
        }

        let successCount = 0;
        let failCount = 0;

        try {
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                setStatusText(`Uploading ${i + 1}/${validFiles.length}: ${file.name}`);

                try {
                    await uploadSingleFile(file);
                    successCount++;
                } catch (err) {
                    console.error(err);
                    failCount++;
                    // Optionally toast error for specific file or just continue
                }

                // Update progress
                setProgress(Math.round(((i + 1) / validFiles.length) * 100));
            }

            if (failCount === 0) {
                toast.success(`Uploaded ${successCount} files successfully!`);
                setOpen(false);
                setFiles(null);
            } else {
                toast.warning(`Finished. Success: ${successCount}, Failed: ${failCount}`);
            }

        } catch (error) {
            console.error("Upload process error:", error);
            toast.error("An unexpected error occurred during upload.");
        } finally {
            setUploading(false);
            setStatusText("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-600/30 gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-slate-100">
                <DialogHeader>
                    <DialogTitle>Upload FITS Data</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Upload single FITS files or entire directories.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="folder-mode"
                            checked={isFolderMode}
                            onCheckedChange={(checked) => {
                                setIsFolderMode(checked);
                                setFiles(null); // Reset selection on mode change
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                        />
                        <Label htmlFor="folder-mode" className="flex items-center gap-2 cursor-pointer">
                            {isFolderMode ? <FolderOpen className="w-4 h-4 text-yellow-400" /> : <Upload className="w-4 h-4 text-blue-400" />}
                            {isFolderMode ? "Folder Upload Mode" : "Single File Mode"}
                        </Label>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="file">
                            {isFolderMode ? "Select Folder" : "Select File"}
                        </Label>

                        {/* Conditional Rendering to ensure attributes apply correctly */}
                        {isFolderMode ? (
                            <Input
                                ref={fileInputRef}
                                id="file-folder"
                                type="file"
                                // @ts-ignore
                                webkitdirectory=""
                                directory=""
                                multiple
                                onChange={handleFileChange}
                                className="bg-slate-800 border-slate-600 text-slate-100 cursor-pointer"
                            />
                        ) : (
                            <Input
                                ref={fileInputRef}
                                id="file-single"
                                type="file"
                                accept=".fits,.fits.gz"
                                multiple={false}
                                onChange={handleFileChange}
                                className="bg-slate-800 border-slate-600 text-slate-100 cursor-pointer"
                            />
                        )}

                        {files && (
                            <p className="text-sm text-slate-400 mt-1">
                                Selected: {files.length} file(s)
                            </p>
                        )}
                    </div>

                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-300">
                                <span>{statusText}</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                </div>

                <DialogFooter>
                    <Button
                        onClick={handleUpload}
                        disabled={!files || uploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            "Start Upload"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
