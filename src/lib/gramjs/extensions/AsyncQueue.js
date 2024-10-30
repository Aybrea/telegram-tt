// AsyncQueue class for managing asynchronous queue operations.
class AsyncQueue {
    constructor() {
        // Internal queue to store elements in the order they're added.
        this._queue = [];

        // Promise to control the pop operation, resolved when an item can be retrieved.
        this.canGet = new Promise((resolve) => {
            this.resolveGet = resolve;
        });

        // Flag and promise to control the push operation, allowing pushes initially.
        this.canPush = true;
    }

    // Push a new item into the queue
    async push(value) {
        // Wait for any prior push to complete.
        await this.canPush;

        // Add the new value to the end of the queue.
        this._queue.push(value);

        // Resolve the canGet promise, allowing a pop operation to proceed.
        this.resolveGet(true);

        // Set canPush to a new Promise, pausing further pushes until the next pop.
        this.canPush = new Promise((resolve) => {
            this.resolvePush = resolve;
        });
    }

    // Pop an item from the queue
    async pop() {
        // Wait for an item to be available for popping.
        await this.canGet;

        // Remove and return the last item in the queue.
        const returned = this._queue.pop();

        // Resolve the canPush promise, allowing a push operation to proceed.
        this.resolvePush(true);

        // Set canGet to a new Promise, pausing further pops until the next push.
        this.canGet = new Promise((resolve) => {
            this.resolveGet = resolve;
        });

        return returned;
    }
}

// Export the AsyncQueue class as a module to use in other files.
module.exports = AsyncQueue;
