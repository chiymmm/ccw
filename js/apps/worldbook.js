class WorldbookStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('worldbook_data')) {
            const initialData = {
                books: [], // {id, name, entries: [{id, keys:[], content:'', enabled:true}]}
                bindings: {} // {characterId: [bookId1, bookId2]}
            };
            localStorage.setItem('worldbook_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('worldbook_data')); }
    set(data) { localStorage.setItem('worldbook_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class WorldbookApp {
    constructor() {
        this.store = new WorldbookStore();
        this.currentTab = 'books';
        this.currentBookId = null;
        this.initUI();
    }

    initUI() {
        // Tabs
        document.querySelectorAll('.wb-tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.wb-tab').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                
                document.getElementById('wbBooksPage').style.display = this.currentTab === 'books' ? 'block' : 'none';
                document.getElementById('wbBindPage').style.display = this.currentTab === 'bind' ? 'block' : 'none';
                
                if(this.currentTab === 'books') this.renderBooks();
                if(this.currentTab === 'bind') this.renderBindings();
            };
        });

        // FAB
        document.getElementById('wbFab').onclick = () => {
            if(this.currentTab === 'books') {
                if(this.currentBookId) this.openEntryEditor();
                else this.createNewBook();
            }
        };

        // Book Detail Back
        document.getElementById('wbBackBtn').onclick = () => {
            if(this.currentBookId) {
                this.currentBookId = null;
                this.renderBooks();
                document.getElementById('wbTitle').innerText = '世界书';
                document.getElementById('wbBackBtn').style.display = 'none';
            } else {
                window.showPage('homeScreen');
            }
        };

        // Entry Editor
        document.getElementById('closeWbEntry').onclick = () => document.getElementById('wbEntryModal').style.display = 'none';
        document.getElementById('saveWbEntry').onclick = () => this.saveEntry();

        // Import
        document.getElementById('wbImportBtn').onclick = () => document.getElementById('wbImportInput').click();
        document.getElementById('wbImportInput').onchange = (e) => this.importBook(e.target.files[0]);

        // Add AI Complete Button to Editor
        const editorContent = document.querySelector('#wbEntryModal .sub-content');
        if(editorContent && !document.getElementById('wbAiCompleteBtn')) {
            const btn = document.createElement('button');
            btn.id = 'wbAiCompleteBtn';
            btn.className = 'action-btn secondary';
            btn.style.marginTop = '10px';
            btn.innerText = 'AI 自动补全设定';
            btn.onclick = () => this.aiCompleteEntry();
            editorContent.appendChild(btn);
        }

        this.renderBooks();
    }

    renderBooks() {
        const list = document.getElementById('wbList');
        list.innerHTML = '';
        const data = this.store.get();

        if(this.currentBookId) {
            // Render Entries
            const book = data.books.find(b => b.id === this.currentBookId);
            if(!book) { this.currentBookId = null; return this.renderBooks(); }
            
            document.getElementById('wbTitle').innerText = book.name;
            document.getElementById('wbBackBtn').style.display = 'block';

            if(book.entries.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">暂无条目，点击右下角添加</div>';
            }

            book.entries.forEach(e => {
                const div = document.createElement('div');
                div.className = 'wb-entry-item';
                
                // Auto-link logic (simple)
                let preview = e.content;
                book.entries.forEach(other => {
                    if(other.id !== e.id && other.keys.length > 0) {
                        const key = other.keys[0];
                        if(preview.includes(key)) {
                            preview = preview.replace(new RegExp(key, 'g'), `<span style="color:#1890ff;cursor:pointer;">${key}</span>`);
                        }
                    }
                });

                div.innerHTML = `
                    <div class="wb-entry-keys">${e.keys.join(', ')}</div>
                    <div class="wb-entry-preview">${preview}</div>
                    <div class="wb-entry-actions">
                        <i class="fas fa-trash" style="color:#ff4d4f; cursor:pointer;"></i>
                    </div>
                `;
                div.onclick = (evt) => {
                    if(evt.target.classList.contains('fa-trash')) return;
                    this.openEntryEditor(e);
                };
                
                div.querySelector('.fa-trash').onclick = (evt) => {
                    evt.stopPropagation();
                    if(confirm('删除此条目？')) {
                        this.store.update(d => {
                            const b = d.books.find(x => x.id === this.currentBookId);
                            if(b) b.entries = b.entries.filter(x => x.id !== e.id);
                        });
                        this.renderBooks();
                    }
                };

                list.appendChild(div);
            });

        } else {
            // Render Books List
            document.getElementById('wbTitle').innerText = '世界书';
            document.getElementById('wbBackBtn').style.display = 'none';

            if(data.books.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">暂无世界书，点击右下角创建或右上角导入</div>';
            }

            data.books.forEach(b => {
                const div = document.createElement('div');
                div.className = 'wb-book-item';
                div.innerHTML = `
                    <div class="wb-book-icon"><i class="fas fa-book"></i></div>
                    <div class="wb-book-info">
                        <div class="wb-book-name">${b.name}</div>
                        <div class="wb-book-count">${b.entries.length} 条目</div>
                    </div>
                    <div class="wb-book-actions" style="margin-right:10px;">
                        <i class="fas fa-trash" style="color:#ff4d4f; cursor:pointer;"></i>
                    </div>
                    <i class="fas fa-chevron-right" style="color:#ccc;"></i>
                `;
                div.onclick = (evt) => {
                    if(evt.target.classList.contains('fa-trash')) return;
                    this.currentBookId = b.id;
                    this.renderBooks();
                };
                
                div.querySelector('.fa-trash').onclick = (evt) => {
                    evt.stopPropagation();
                    if(confirm(`删除世界书 "${b.name}"?`)) {
                        this.store.update(d => d.books = d.books.filter(x => x.id !== b.id));
                        this.renderBooks();
                    }
                };
                
                list.appendChild(div);
            });
        }
    }

    createNewBook() {
        const name = prompt('输入世界书名称:');
        if(name) {
            this.store.update(d => d.books.push({
                id: window.Utils.generateId('wb'),
                name,
                entries: []
            }));
            this.renderBooks();
        }
    }

    openEntryEditor(entry = null) {
        const modal = document.getElementById('wbEntryModal');
        modal.style.display = 'flex';
        
        if(entry) {
            document.getElementById('wbEntryKeys').value = entry.keys.join(',');
            document.getElementById('wbEntryContent').value = entry.content;
            modal.dataset.id = entry.id;
        } else {
            document.getElementById('wbEntryKeys').value = '';
            document.getElementById('wbEntryContent').value = '';
            delete modal.dataset.id;
        }
    }

    async aiCompleteEntry() {
        const keysStr = document.getElementById('wbEntryKeys').value;
        if(!keysStr) return alert('请先输入关键词');
        
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('wbAiCompleteBtn');
        btn.innerText = '生成中...';
        
        const prompt = `请为世界书条目 "${keysStr}" 生成详细的设定内容。
        要求：内容丰富，包含背景、特征、历史等。`;
        
        try {
            const content = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            document.getElementById('wbEntryContent').value = content;
        } catch(e) { alert('生成失败'); }
        finally { btn.innerText = 'AI 自动补全设定'; }
    }

    saveEntry() {
        const keysStr = document.getElementById('wbEntryKeys').value;
        const content = document.getElementById('wbEntryContent').value;
        const modal = document.getElementById('wbEntryModal');
        const id = modal.dataset.id;

        if(!keysStr || !content) return alert('请填写完整');

        const keys = keysStr.split(/[,，]/).map(k => k.trim()).filter(k => k);

        this.store.update(d => {
            const book = d.books.find(b => b.id === this.currentBookId);
            if(book) {
                if(id) {
                    const entry = book.entries.find(e => e.id === id);
                    if(entry) {
                        entry.keys = keys;
                        entry.content = content;
                    }
                } else {
                    book.entries.push({
                        id: window.Utils.generateId('ent'),
                        keys,
                        content,
                        enabled: true
                    });
                }
            }
        });

        modal.style.display = 'none';
        this.renderBooks();
    }

    importBook(file) {
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                let entries = [];
                let name = file.name.replace('.json', '');

                if(json.entries) {
                    Object.values(json.entries).forEach(ent => {
                        entries.push({
                            id: window.Utils.generateId('ent'),
                            keys: ent.key || [],
                            content: ent.content || '',
                            enabled: ent.enabled !== false
                        });
                    });
                } else if (Array.isArray(json)) {
                    json.forEach(ent => {
                        if(ent.keys && ent.content) {
                            entries.push({
                                id: window.Utils.generateId('ent'),
                                keys: Array.isArray(ent.keys) ? ent.keys : [ent.keys],
                                content: ent.content,
                                enabled: true
                            });
                        }
                    });
                }

                if(entries.length > 0) {
                    this.store.update(d => d.books.push({
                        id: window.Utils.generateId('wb'),
                        name,
                        entries
                    }));
                    alert(`成功导入 ${entries.length} 条目`);
                    this.renderBooks();
                } else {
                    alert('未识别到有效的世界书条目');
                }

            } catch(err) {
                alert('文件格式错误');
                console.error(err);
            }
        };
        reader.readAsText(file);
    }

    async renderBindings() {
        const list = document.getElementById('wbBindList');
        list.innerHTML = '';
        const data = this.store.get();
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');

        for(const f of qqData.friends) {
            const div = document.createElement('div');
            div.className = 'wb-bind-item';
            
            let avatar = f.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);

            const boundBooks = data.bindings[f.id] || [];

            let booksHtml = '';
            data.books.forEach(b => {
                const isSelected = boundBooks.includes(b.id);
                booksHtml += `<div class="wb-chip ${isSelected ? 'selected' : ''}" data-bid="${b.id}">${b.name}</div>`;
            });

            div.innerHTML = `
                <div class="wb-bind-header">
                    <div class="wb-bind-avatar" style="background-image:url('${avatar}')"></div>
                    <span style="font-weight:bold;">${f.name}</span>
                </div>
                <div class="wb-bind-books">${booksHtml}</div>
            `;

            div.querySelectorAll('.wb-chip').forEach(chip => {
                chip.onclick = () => {
                    const bid = chip.dataset.bid;
                    this.toggleBinding(f.id, bid);
                };
            });

            list.appendChild(div);
        }
    }

    toggleBinding(charId, bookId) {
        this.store.update(d => {
            if(!d.bindings[charId]) d.bindings[charId] = [];
            const idx = d.bindings[charId].indexOf(bookId);
            if(idx >= 0) d.bindings[charId].splice(idx, 1);
            else d.bindings[charId].push(bookId);
        });
        this.renderBindings();
    }
}

window.WorldbookApp = new WorldbookApp();
