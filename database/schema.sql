    CREATE TABLE fits_headers (

    -- Primary identity
    id BIGSERIAL PRIMARY KEY,
    fileid BIGINT UNIQUE NOT NULL,

    -- FITS core
    simple BOOLEAN,
    bitpix INTEGER,
    naxis INTEGER,
    naaxis1 INTEGER,
    naaxis2 INTEGER,

    -- Observation classification
    data_type VARCHAR(50),
    qual_fac INTEGER,
    obs_cmts TEXT,

    -- People
    pi_name VARCHAR(255),
    observer VARCHAR(255),
    tel_oprt VARCHAR(255),

    -- Telescope / site
    telescope VARCHAR(50),
    origin VARCHAR(255),
    observat VARCHAR(255),

    obs_elev DOUBLE PRECISION,
    obs_lat DOUBLE PRECISION,
    obs_long DOUBLE PRECISION,

    -- Instrument
    instrume VARCHAR(100),
    filter1 VARCHAR(50),
    filter2 VARCHAR(50),

    -- Target / celestial
    cat_comp BOOLEAN,
    solarobj BOOLEAN,
    radecsys VARCHAR(50),
    epoch VARCHAR(20),

    trg_name VARCHAR(255),
    trg_alph DOUBLE PRECISION,
    trg_delt DOUBLE PRECISION,
    trg_type VARCHAR(100),
    trg_epoc INTEGER,

    -- Image info
    bunit VARCHAR(50),
    datamax INTEGER,
    datamin INTEGER,

    -- Timing
    date_obs TIMESTAMP,
    obs_date DATE,
    obs_time TIME,
    obs_tsys VARCHAR(20),
    obs_mjd DOUBLE PRECISION,

    -- Observation conditions
    obs_airm DOUBLE PRECISION,
    moonangl DOUBLE PRECISION,

    -- CCD
    obs_type VARCHAR(50),
    ccd_expt DOUBLE PRECISION,
    ccd_gain DOUBLE PRECISION,
    ccd_rdns DOUBLE PRECISION,

    -- Calibration
    ins_lamp VARCHAR(100),

    -- FITS scaling
    o_bzero INTEGER,
    bscale INTEGER,
    bzero INTEGER,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
