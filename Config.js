// Should all images be checked?
export let CheckAll = false;

// Should images be checked only once or daily?
export let CheckOnce = true;

// Your Stable Diffusion API URL (ip/domain:port)
export let SDAPI = "";

// Your SDAPI authentication information (username:password)
export let SDAPIAuth = "";

// Your Piwigo URL (exampledomain.com)
export let PiwigoURL = "";

// Your Piwigo admin username
export let PiwigoAdminUsername = "";

// Your Piwigo admin password
export let PiwigoAdminPassword = "";

// Your Piwigo MySQL instance data
export let MYSQLData = {
    connectionLimit: 10,
    host: '',
    user: '',
    password: '',
    database: ''
};