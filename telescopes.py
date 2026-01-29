VALID_INSTRUMENTS = {
    "2.5m": {"BOSS", "APOGEE", "MOD", "NISP", "FOC", "SPI"},
    "1.2m": {"Echelle"},
}

def validate_telescope_instrument(telescope, instruments):
    """
    Validate if the provided instruments are valid for the given telescope.
    :param telescope: Telescope name as string.
    :param instruments: List of instrument names.
    :return: True if all instruments are valid for the telescope, False otherwise.
    """
    normalized_telescope = telescope.strip().lower()
    valid_instruments = VALID_INSTRUMENTS.get(normalized_telescope, set())
    
    for instrument in instruments:
        normalized_instrument = instrument.strip().lower()
        if normalized_instrument not in map(str.lower, valid_instruments):
            return False
    return True

