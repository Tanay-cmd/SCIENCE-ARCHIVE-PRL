import { TELESCOPE_CONFIG, normalizeTelescopeName } from "./telescopeConfig";
import { toast } from "@/components/ui/use-toast";

/**
 * Filter instruments based on selected telescopes
 * @param selectedTelescopes Array of selected telescope names
 * @returns Array of valid instrument names for the selected telescopes
 */
export function getValidInstrumentsForTelescopes(telescopes: string[]): string[] {
  if (telescopes.length === 0) {
    // If no telescopes selected, return all possible instruments
    return getAllInstruments();
  }
  
  const validInstruments = new Set<string>();
  
  telescopes.forEach(telescope => {
    if (telescope in TELESCOPE_CONFIG) {
      // Get the configured instruments for this telescope
      const configInstruments = Object.keys(TELESCOPE_CONFIG[telescope as keyof typeof TELESCOPE_CONFIG].instruments);
      
      // Add all instruments for this telescope to our set
      configInstruments.forEach(instrument => {
        validInstruments.add(instrument);
      });
    }
  });
  
  return Array.from(validInstruments).sort();
}

/**
 * Get all instruments from the telescope configuration
 * @returns Array of all available instrument names
 */
export function getAllInstruments(): string[] {
  const instruments = new Set<string>();
  
  Object.values(TELESCOPE_CONFIG).forEach(config => {
    Object.keys(config.instruments).forEach(instrument => {
      instruments.add(instrument);
    });
  });
  
  return Array.from(instruments).sort();
}

/**
 * Filter observation types based on selected telescopes and instruments
 * @param selectedTelescopes Array of selected telescope names
 * @param selectedInstruments Array of selected instrument names
 * @returns Array of valid observation types for the selected telescopes and instruments
 */
export function getValidObsTypesForTelescopesAndInstruments(
  telescopes: string[],
  instruments: string[]
): string[] {
  if (telescopes.length === 0 || instruments.length === 0) {
    // If no telescopes or instruments selected, return all possible observation types
    return getAllObservationTypes();
  }
  
  const validObsTypes = new Set<string>();
  
  telescopes.forEach(telescope => {
    if (telescope in TELESCOPE_CONFIG) {
      const telescopeConfig = TELESCOPE_CONFIG[telescope as keyof typeof TELESCOPE_CONFIG];
      
      instruments.forEach(instrument => {
        // Check if this instrument exists for this telescope
        if (instrument.toUpperCase() in telescopeConfig.instruments) {
          // Add all observation types for this telescope-instrument combination
          const obsTypes = telescopeConfig.instruments[instrument.toUpperCase()];
          obsTypes.forEach(obsType => {
            validObsTypes.add(obsType);
          });
        }
      });
    }
  });
  
  return Array.from(validObsTypes).sort();
}

/**
 * Get all observation types from the telescope configuration
 * @returns Array of all available observation types
 */
export function getAllObservationTypes(): string[] {
  const obsTypes = new Set<string>();
  
  Object.values(TELESCOPE_CONFIG).forEach(config => {
    Object.values(config.instruments).forEach(typesArray => {
      typesArray.forEach(obsType => {
        obsTypes.add(obsType);
      });
    });
  });
  
  return Array.from(obsTypes).sort();
}

/**
 * Find all telescopes that support a specific instrument
 * @param instrument Instrument name
 * @returns Array of telescope names that support the instrument
 */
export function findTelescopesForInstrument(instrument: string): string[] {
  return Object.entries(TELESCOPE_CONFIG)
    .filter(([_, config]) => {
      return Object.keys(config.instruments)
        .some(configInstrument => 
          configInstrument.toUpperCase() === instrument.toUpperCase()
        );
    })
    .map(([telescope, _]) => telescope);
}

/**
 * Find all telescopes and instruments that support a specific observation type
 * @param obsType Observation type
 * @returns Object containing arrays of telescope and instrument names
 */
export function findTelescopesAndInstrumentsForObsType(obsType: string): { 
  telescopes: string[], 
  instruments: string[] 
} {
  const telescopes = new Set<string>();
  const instruments = new Set<string>();
  
  Object.entries(TELESCOPE_CONFIG).forEach(([telescope, config]) => {
    Object.entries(config.instruments).forEach(([instrument, obsTypes]) => {
      if (obsTypes.includes(obsType)) {
        telescopes.add(telescope);
        instruments.add(instrument);
      }
    });
  });
  
  return {
    telescopes: Array.from(telescopes),
    instruments: Array.from(instruments)
  };
}

/**
 * Validate the combination of selected telescopes and instruments
 * @param telescopes Array of selected telescope names
 * @param instruments Array of selected instrument names
 * @returns Object with validation result and error message if invalid
 */
export function validateTelescopeInstrumentCombination(
  telescopes: string[],
  instruments: string[]
): { valid: boolean; message?: string } {
  // If nothing selected, it's valid
  if (telescopes.length === 0 || instruments.length === 0) {
    return { valid: true };
  }
  
  // Validate telescope names
  const invalidTelescopes = telescopes.filter(t => !(t in TELESCOPE_CONFIG));
  if (invalidTelescopes.length > 0) {
    return { 
      valid: false,
      message: `Unknown telescope(s): ${invalidTelescopes.join(', ')}`
    };
  }
  
  // Validate telescope-instrument combinations
  const validInstruments = getValidInstrumentsForTelescopes(telescopes);
  const invalidInstruments = instruments.filter(
    inst => !validInstruments.includes(inst)
  );
  
  if (invalidInstruments.length > 0) {
    return {
      valid: false,
      message: `The selected instruments (${invalidInstruments.join(', ')}) are not compatible with the selected telescope(s).`
    };
  }
  
  return { valid: true };
}

/**
 * Show a toast message for validation errors
 * @param valid Validation result object
 * @param toastFunction Toast function to use
 */
export function showValidationErrorToast(
  validationResult: { valid: boolean; message?: string },
  toastFunction: any
): void {
  if (!validationResult.valid && validationResult.message) {
    toastFunction({
      title: "Invalid Filter Combination",
      description: validationResult.message,
      variant: "destructive"
    });
  }
}

/**
 * Build URL parameters for the filtered search API
 * @param filters Object containing filter parameters
 * @returns URLSearchParams object
 */
export function buildFilteredSearchParams({
  telescopes = [],
  instruments = [],
  observationTypes = [],
  mode = "",
  observer = ""
}: {
  telescopes?: string[];
  instruments?: string[];
  observationTypes?: string[];
  mode?: string;
  observer?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  
  if (telescopes.length > 0) {
    const validTelescopes = telescopes.filter(t => t in TELESCOPE_CONFIG);
    if (validTelescopes.length > 0) {
      params.append('telescopes', validTelescopes.join(','));
    }
  }
  
  if (instruments.length > 0) {
    const validInstruments = telescopes.length > 0
      ? getValidInstrumentsForTelescopes(telescopes)
      : getAllInstruments();
    
    const normalizedInstruments = instruments
      .filter(inst => validInstruments.includes(inst))
      .map(i => i.trim().toUpperCase());
    
    if (normalizedInstruments.length > 0) {
      params.append('instruments', normalizedInstruments.join(','));
    }
  }
  
  if (observationTypes.length > 0) {
    params.append('observationTypes', observationTypes.join(','));
  }
  
  if (mode) {
    params.append('mode', mode);
  }
  
  if (observer) {
    params.append('observer', observer);
  }
  
  return params;
}

