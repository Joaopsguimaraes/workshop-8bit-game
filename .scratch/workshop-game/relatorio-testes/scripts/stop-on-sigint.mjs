// Preloaded with `node --import`: a SIGINT becomes process.exit(0), so --cpu-prof writes its file.
// Without this listener Node is killed by the signal and the profile is lost.
process.on("SIGINT", () => process.exit(0));
