class AppUsageStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('app_usage_data')) {
            const initialData = {
                records: [] // {id, appName, duration, time, narration}
            };
            localStorage.setItem('app_usage_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('app_usage_data')); }
    set(data) { localStorage.setItem('app_usage_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class AppUsageApp {
    constructor() {
        this.store = new AppUsageStore();
    }

    render() {
        const container = document.getElementById('birthdayApp'); // Reusing container
        container.innerHTML = `
            <div class="usage-header" style="background:#fff; padding:20px; border-bottom:1px solid #eee;">
                <div style="font-size:24px; font-weight:bold;">屏幕使用时间</div>
                <div style="color:#666; margin-top:5px;">今天</div>
                <i class="fas fa-sync-alt" id="usageGenBtn" style="position:absolute; top:20px; right:20px; cursor:pointer;"></i>
                
                <div id="usageChart" style="margin-top:20px; height:100px; display:flex; align-items:flex-end; gap:5px;">
                    <!-- Chart bars will be injected here -->
                </div>
            </div>
            <div id="usageList" style="padding:10px;"></div>
        `;
        
        document.getElementById('usageGenBtn').onclick = () => this.generateUsage();
        this.renderList();
    }

    renderList() {
        const list = document.getElementById('usageList');
        const chart = document.getElementById('usageChart');
        list.innerHTML = '';
        chart.innerHTML = '';
        
        const data = this.store.get();
        
        if(data.records.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">暂无记录</div>';
            return;
        }

        const sortedRecords = data.records.sort((a, b) => b.time - a.time);
        
        // Simple Chart
        const maxDuration = 120; // Assume max 2 hours for scaling
        sortedRecords.slice(0, 7).forEach(rec => {
            const mins = parseInt(rec.duration) || 30; // Simple parsing
            const height = Math.min(100, (mins / maxDuration) * 100);
            const bar = document.createElement('div');
            bar.style.cssText = `flex:1; background:#007aff; border-radius:4px 4px 0 0; height:${height}%; opacity:0.8;`;
            chart.appendChild(bar);
        });

        sortedRecords.forEach(rec => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#fff; padding:15px; border-radius:10px; margin-bottom:10px; display:flex; align-items:center; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.05);';
            
            let icon = 'fas fa-mobile-alt';
            let color = '#333';
            if(rec.appName.includes('QQ')) { icon = 'fab fa-qq'; color = '#12b7f5'; }
            else if(rec.appName.includes('Twitter') || rec.appName.includes('X')) { icon = 'fab fa-twitter'; color = '#1d9bf0'; }
            else if(rec.appName.includes('Instagram')) { icon = 'fab fa-instagram'; color = '#e1306c'; }
            else if(rec.appName.includes('备忘录')) { icon = 'fas fa-sticky-note'; color = '#f1c40f'; }
            else if(rec.appName.includes('音乐')) { icon = 'fas fa-music'; color = '#2ecc71'; }

            div.innerHTML = `
                <div style="width:40px; height:40px; background:${color}; border-radius:8px; display:flex; justify-content:center; align-items:center; color:#fff; margin-right:15px;">
                    <i class="${icon}"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:bold;">${rec.appName}</div>
                    <div style="font-size:12px; color:#999;">${rec.duration}</div>
                </div>
                <i class="fas fa-chevron-right" style="color:#ccc;"></i>
            `;
            
            div.onclick = () => this.openDetail(rec);
            list.appendChild(div);
        });
    }

    openDetail(rec) {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.background = '#f5f5f7';
        modal.innerHTML = `
            <div class="sub-header" style="background:#fff;">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i> 返回</button>
                <span class="sub-title">${rec.appName}</span>
            </div>
            <div style="padding:20px;">
                <div style="background:#fff; padding:20px; border-radius:15px; margin-bottom:20px;">
                    <div style="font-size:12px; color:#999; margin-bottom:5px;">使用时长</div>
                    <div style="font-size:32px; font-weight:bold;">${rec.duration}</div>
                </div>
                <div style="background:#fff; padding:20px; border-radius:15px;">
                    <div style="font-size:14px; font-weight:bold; margin-bottom:10px;">活动记录</div>
                    <div style="line-height:1.6; color:#333;">${rec.narration}</div>
                </div>
            </div>
        `;
        document.getElementById('birthdayApp').appendChild(modal);
    }

    async generateUsage() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('usageGenBtn');
        btn.className = 'fas fa-spinner fa-spin';
        
        const char = window.System.currentCheckedFriend;
        if(!char) return alert('请先选择角色');
        
        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，生成相关的APP使用记录。\n`;

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n${memoryPrompt}\n请生成一条手机APP使用记录。\n包括APP名称、使用时长、以及一段旁白解释当时在做什么（不少于30字）。\n返回 JSON: {"appName": "APP名", "duration": "1小时20分", "narration": "旁白内容"}`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            const rec = JSON.parse(res);
            
            this.store.update(d => {
                d.records.unshift({
                    id: Date.now(),
                    appName: rec.appName,
                    duration: rec.duration,
                    narration: rec.narration,
                    time: Date.now()
                });
            });
            this.renderList();
        } catch(e) { alert('生成失败'); }
        finally { btn.className = 'fas fa-sync-alt'; }
    }
}

window.AppUsageApp = new AppUsageApp();
