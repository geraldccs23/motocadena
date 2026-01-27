let NIGHT_SHIFTS_ENABLED = false;

exports.getNightEnabled = () => NIGHT_SHIFTS_ENABLED;
exports.setNightEnabled = (enabled) => { NIGHT_SHIFTS_ENABLED = !!enabled; };