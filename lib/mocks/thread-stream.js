
// Mock implementation of thread-stream for browser/Turbopack builds
// This prevents bundling of full thread-stream package which causes issues with README.md and test files
// and replaces it with a no-op implementation.

class ThreadStream {
    constructor() {
        this.on = () => { };
        this.emit = () => { };
        this.write = () => true;
        this.end = () => { };
        this.flush = () => { };
    }
}

module.exports = ThreadStream;
