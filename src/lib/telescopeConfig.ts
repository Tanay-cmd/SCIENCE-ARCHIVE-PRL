export const TELESCOPE_CONFIG = {
  "2.5m": {
    instruments: {
      "PARAS2": ["Spectroscopy"],
      "PROTOPOL": ["Spectroscopy", "Polarization"],
      "FOC": ["Photometry"],
      "NISP": ["Photometry", "Polarization"],
      "SPI": ["Photometry"]
    },
    headerValues: ["2.5m"],
    displayName: "2.5m"
  },
  "1.2m": {
    instruments: {
      "NICS": ["Photometry", "Spectroscopy"],
      "HiRes": ["Spectroscopy"],
      "LISA": ["Spectroscopy"],
      "OPOL": ["Polarization"],
      "EMPOL": ["Polarization"],
      "MFOSC": ["Spectroscopy"],
      "WFI": ["Photometry"],
      "LN2-CCD": ["Photometry"],
      "PARAS1": ["Spectroscopy"]
    },
    headerValues: ["1.2m"],
    displayName: "1.2m"
  },
  "43cm": {
    instruments: {
      "SCI": ["Photometry"]
    },
    headerValues: ["43 cm"],
    displayName: "43cm"
  },
  "50cm": {
    instruments: {
      "EM-CCD": ["Photometry"],
      "LISA": ["Spectroscopy"]
    },
    headerValues: ["50 cm"],
    displayName: "50cm"
  }
}; 

// Simplified telescope name normalization
export const normalizeTelescopeName = (name: string): string => {
  if (!name) return "";
  const normalized = name.trim();
  
  // Simple mapping for exact header values
  switch (normalized) {
    case "2.5m": return "2.5m";
    case "1.2m": return "1.2m";
    case "43 cm": return "43cm";
    case "50 cm": return "50cm";
    default: return normalized;
  }
};

// Get valid instruments for a telescope
export const getValidInstrumentsForTelescope = (telescope: string): string[] => {
  const normalizedName = normalizeTelescopeName(telescope);
  const config = TELESCOPE_CONFIG[normalizedName as keyof typeof TELESCOPE_CONFIG];
  
  if (!config) {
    console.warn(`No configuration found for telescope: ${telescope} (normalized: ${normalizedName})`);
    return [];
  }
  
  return Object.keys(config.instruments);
};

// Add helper to check if a telescope name is valid
export const isValidTelescopeName = (name: string): boolean => {
  const normalized = normalizeTelescopeName(name);
  return normalized in TELESCOPE_CONFIG;
};
