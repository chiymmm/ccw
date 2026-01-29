class DB {
    constructor(dbName = 'AIPhoneDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.ready = this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('data')) {
                    db.createObjectStore('data', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('DB initialized');
                resolve();
            };

            request.onerror = (event) => {
                console.error('DB init error', event);
                reject(event);
            };
        });
    }

    async saveImage(blobOrBase64) {
        await this.ready;
        const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.put({ id, data: blobOrBase64 });

            request.onsuccess = () => resolve(id);
            request.onerror = (e) => reject(e);
        });
    }

    async getImage(id) {
        await this.ready;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result ? request.result.data : null);
            request.onerror = (e) => reject(e);
        });
    }

    async saveData(key, value) {
        await this.ready;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    async getData(key) {
        await this.ready;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readonly');
            const store = transaction.objectStore('data');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = (e) => reject(e);
        });
    }
    
    async deleteData(key) {
        await this.ready;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }
}

window.db = new DB();
