class ShopStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('shop_data')) {
            const initialData = {
                cart: [], // {id, title, price, image, sellerId}
                orders: [], // {id, items, total, status: 'unpaid'|'unshipped'|'shipped'|'completed', time, type: 'buy'|'takeout', receiverId, review: null}
                chats: [], // {sellerName, messages:[]}
                user: {
                    addresses: [], // {id, name, phone, address}
                    coupons: [],
                    points: 0
                }
            };
            localStorage.setItem('shop_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('shop_data')); }
    set(data) { localStorage.setItem('shop_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class ShopApp {
    constructor() {
        this.store = new ShopStore();
        this.currentTab = 'home'; // home, cart, chat, me
        this.currentMode = 'shopping'; // shopping, takeout
        this.targetReceiverId = null; // For takeout
        this.initUI();
    }

    initUI() {
        // Update Header with Gen Button
        const headerIcons = document.querySelector('.shop-header-icons');
        // Use SVG for icons
        const svgPlus = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#333"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
        const svgCart = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#333"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>`;
        const svgChat = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#333"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
        const svgSearch = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#999"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;

        headerIcons.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <div id="shopGenBtn" style="cursor:pointer;display:flex;" title="生成商品">${svgPlus}</div>
                <div onclick="window.ShopApp.currentTab='cart';window.ShopApp.render()" style="cursor:pointer;display:flex;">${svgCart}</div>
                <div onclick="window.ShopApp.currentTab='chat';window.ShopApp.render()" style="cursor:pointer;display:flex;">${svgChat}</div>
            </div>
        `;
        document.getElementById('shopGenBtn').onclick = () => this.generateItems();

        // Update Search Bar with SVG
        const searchBar = document.querySelector('.shop-search-bar');
        if(searchBar) {
            searchBar.innerHTML = `
                <div id="shopSearchBtn" style="cursor:pointer;display:flex;margin-right:5px;">${svgSearch}</div>
                <input type="text" id="shopSearchInput" placeholder="搜索商品" style="border:none;background:transparent;outline:none;width:100%;">
            `;
        }

        document.querySelectorAll('.shop-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.shop-nav-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.render();
            };
        });

        document.querySelectorAll('.shop-tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.shop-tab').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = btn.dataset.mode;
                this.renderHome();
            };
        });

        const searchInput = document.getElementById('shopSearchInput');
        const searchBtn = document.getElementById('shopSearchBtn');
        
        const doSearch = () => this.generateItems(false, searchInput.value);

        if(searchInput) {
            searchInput.onkeydown = (e) => {
                if(e.key === 'Enter') doSearch();
            };
        }
        if(searchBtn) {
            searchBtn.onclick = doSearch;
        }
    }

    switchToTakeout(receiverId) {
        this.currentMode = 'takeout';
        this.targetReceiverId = receiverId;
        this.currentTab = 'home';
        
        document.querySelectorAll('.shop-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.shop-nav-item[data-tab="home"]').classList.add('active');
        
        document.querySelectorAll('.shop-tab').forEach(el => el.classList.remove('active'));
        document.querySelector('.shop-tab[data-mode="takeout"]').classList.add('active');
        
        this.render();
        alert(`已切换到外卖模式，正在为 ${receiverId ? '好友' : '自己'} 点餐`);
    }

    render() {
        document.querySelectorAll('.shop-page').forEach(el => el.style.display = 'none');
        document.getElementById(`shop-${this.currentTab}`).style.display = 'block';

        if(this.currentTab === 'home') this.renderHome();
        if(this.currentTab === 'cart') this.renderCart();
        if(this.currentTab === 'chat') this.renderChatList();
        if(this.currentTab === 'me') this.renderMe();
    }

async renderHome() {
    const grid = document.getElementById('shopGrid');
    // 添加空值检查
    if(!grid) {
        console.error('shopGrid element not found');
        return;
    }

    // Don't clear if already has items, unless mode changed or forced
    if(grid.children.length === 0 || grid.dataset.mode !== this.currentMode) {
        grid.dataset.mode = this.currentMode;
        try {
            await this.generateItems(true);
        } catch(error) {
            console.error('生成商品失败:', error);
            // 显示友好的错误提示
            grid.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无商品请点击右上角生成按钮</div>';
        }
    }
}

async generateItems(isInit = false, query = '') {
    // 1. 首先获取并检查 grid 元素
    const grid = document.getElementById('shopGrid');
    if(!grid) {
        console.error('shopGrid 元素未找到');
        return;
    }

    // 2. 然后进行其他检查
    const apiConfig = window.API.getConfig();

    const btn = document.getElementById('shopGenBtn');
    if(btn) btn.style.opacity = '0.5';

    // 3. 显示加载状态（对于非初始化调用）
    if(!isInit) {
        grid.innerHTML = '<div style="text-align:center;width:100%;padding:20px;">生成中...</div>';
    }

    const type = this.currentMode === 'shopping' ? '商品' : '外卖美食';

    // ... 其余代码保持不变

        
        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，推荐相关的${type}。\n`;

        let prompt = `生成 6 个${type}列表。
        ${memoryPrompt}`;
        if(query) prompt += ` 关键词: "${query}"。`;
        prompt += `
        要求：
        1. 包含名称、价格(数字)、图片描述、店铺名称、简短描述(10-20字)。
        2. 为每个商品生成 2-3 条买家评价。
        3. 返回 JSON 数组: [{"title": "名称", "price": 99.9, "imagePrompt": "图片描述", "seller": "店铺名", "desc": "简短描述", "comments": [{"user": "买家名", "content": "评价内容", "score": 5}]}]`;

        // Use system role to ensure memory injection
        const messages = [{ role: 'system', content: prompt }];


            try {
    let items = [];
    if(apiConfig.chatApiKey) {
        const res = await window.API.callAI(messages, apiConfig);

        // 增强的 JSON 解析逻辑
        try {
            items = JSON.parse(res);
        } catch(e) {
            console.log('直接解析失败尝试提取 JSON...', e);
            const jsonMatch = res.match(/\[[\s\S]*\]/);
            if(jsonMatch) {
                try {
                    items = JSON.parse(jsonMatch[0]);
                } catch(e2) {
                    console.log('提取后仍解析失败使用备用数据', e2);
                    items = this.getFallbackItems(query);
                }
            } else {
                console.log('未找到 JSON 数组使用备用数据');
                items = this.getFallbackItems(query);
            }
        }

        // 验证数据结构
        if(!Array.isArray(items) || items.length === 0) {
            console.log('数据格式不正确使用备用数据');
            items = this.getFallbackItems(query);
        }

    } else {
        items = this.getFallbackItems(query);
    }


            grid.innerHTML = '';
            for(const item of items) {
                let imgUrl = window.Utils.generateDefaultImage(item.title);
                
                const div = document.createElement('div');
                div.className = 'shop-item';
                div.innerHTML = `
                    <div class="shop-item-img" style="background-image:url('${imgUrl}')"></div>
                    <div class="shop-item-info">
                        <div class="shop-item-title">${item.title}</div>
                        <div class="shop-item-price">¥${item.price}</div>
                        <div style="font-size:10px;color:#999;">${item.seller}</div>
                        <div class="shop-item-actions">
                            ${this.currentMode === 'shopping' ? `<button class="shop-btn cart">加入购物车</button>` : ''}
                            <button class="shop-btn buy">${this.currentMode === 'shopping' ? '购买' : '立即下单'}</button>
                        </div>
                    </div>
                `;
                
                // Bind click to open detail
                div.querySelector('.shop-item-img').onclick = () => this.openProductDetail({...item, image: imgUrl});
                div.querySelector('.shop-item-title').onclick = () => this.openProductDetail({...item, image: imgUrl});

                if(this.currentMode === 'shopping') {
                    div.querySelector('.cart').onclick = (e) => { e.stopPropagation(); this.addToCart(item, imgUrl); };
                }
                div.querySelector('.buy').onclick = (e) => { e.stopPropagation(); this.buyNow(item); };
                
                const chatBtn = document.createElement('button');
                chatBtn.className = 'shop-btn';
                chatBtn.style.background = '#333';
                chatBtn.style.marginTop = '5px';
                chatBtn.innerText = '私聊';
                chatBtn.onclick = (e) => { e.stopPropagation(); this.startChatWithSeller(item.seller || '官方旗舰店'); };
                div.querySelector('.shop-item-actions').appendChild(chatBtn);
                
                grid.appendChild(div);
            }

        } catch(e) {
            console.error(e);
            grid.innerHTML = '生成失败: ' + e.message;
        } finally {
            if(btn) btn.style.opacity = '1';
        }
    }
    // generateItems 方法结束的大括号后面

    getFallbackItems(query = '') {
        const basePrice = Math.floor(Math.random() * 100) + 10;

        if(query) {
            return [
                {title: `${query} (推荐)`, price: basePrice, imagePrompt: query, seller: '搜索推荐', desc: '热销好物', comments: []},
                {title: `高级${query}`, price: basePrice * 1.5, imagePrompt: query, seller: '品牌店', desc: '品质保证', comments: []},
                {title: `${query}套装`, price: basePrice * 2, imagePrompt: query, seller: '优选店', desc: '超值组合', comments: []},
                {title: `特价${query}`, price: basePrice * 0.8, imagePrompt: query, seller: '折扣店', desc: '限时特惠', comments: []}
            ];
        }

        if(this.currentMode === 'shopping') {
            return [
                {title: '可爱抱枕', price: 45.0, imagePrompt: 'cute pillow', seller: '家居生活馆', desc: '柔软舒适', comments: []},
                {title: '复古台灯', price: 128.0, imagePrompt: 'retro lamp', seller: '光影艺术', desc: '氛围感拉满', comments: []},
                {title: '手账本套装', price: 68.0, imagePrompt: 'notebook set', seller: '文具控', desc: '记录美好生活', comments: []},
                {title: '蓝牙耳机', price: 299.0, imagePrompt: 'bluetooth headphones', seller: '数码科技', desc: '沉浸式体验', comments: []}
            ];
        } else {
            return [
                {title: '炸鸡套餐', price: 35.0, imagePrompt: 'fried chicken', seller: '肯德基', desc: '酥脆多汁', comments: []},
                {title: '麻辣烫', price: 28.0, imagePrompt: 'spicy hot pot', seller: '杨国福', desc: '鲜香麻辣', comments: []},
                {title: '珍珠奶茶', price: 18.0, imagePrompt: 'bubble tea', seller: '蜜雪冰城', desc: '甜蜜滋味', comments: []},
                {title: '寿司拼盘', price: 88.0, imagePrompt: 'sushi platter', seller: '争鲜', desc: '新鲜食材', comments: []}
            ];
        }
    }


    async openProductDetail(item) {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.zIndex = '2000';
        modal.style.background = '#f5f5f5';
        
        const commentsHtml = (item.comments || []).map(c => `
            <div style="border-bottom:1px solid #eee;padding:10px 0;">
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#999;">
                    <span>${c.user}</span>
                    <span>${'★'.repeat(c.score || 5)}</span>
                </div>
                <div style="margin-top:5px;font-size:13px;">${c.content}</div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeProductDetail"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">商品详情</span>
                <div style="display:flex;gap:15px;">
                    <i class="far fa-star" id="favProductBtn" style="cursor:pointer;"></i>
                    <i class="fas fa-share-alt" id="shareProductBtn" style="cursor:pointer;"></i>
                </div>
            </div>
            <div class="sub-content" style="padding:0;background:#fff;">
                <div style="width:100%;height:300px;background-image:url('${item.image}');background-size:cover;background-position:center;"></div>
                <div style="padding:15px;">
                    <div style="color:#ff5000;font-size:24px;font-weight:bold;">¥${item.price}</div>
                    <div style="font-size:18px;font-weight:bold;margin:10px 0;">${item.title}</div>
                    <div style="display:flex;justify-content:space-between;color:#999;font-size:12px;margin-bottom:15px;align-items:center;">
                        <span>快递: 免运费</span>
                        <span>月销 1000+</span>
                        <span style="display:flex;align-items:center;gap:5px;">
                            ${item.seller} 
                            <button id="followStoreBtn" style="border:1px solid #ff5000;color:#ff5000;background:none;border-radius:10px;padding:2px 8px;font-size:10px;">关注</button>
                        </span>
                    </div>
                    <div style="border-top:10px solid #f5f5f5;margin:0 -15px;padding:15px;">
                        <div style="font-weight:bold;margin-bottom:10px;">商品详情</div>
                        <div style="color:#666;line-height:1.6;" id="productDetailDesc">
                            ${item.desc || '正在加载详细描述...'}
                        </div>
                    </div>
                    <div style="border-top:10px solid #f5f5f5;margin:0 -15px;padding:15px;">
                        <div style="font-weight:bold;margin-bottom:10px;">商品评价 (${(item.comments||[]).length})</div>
                        <div id="productComments">${commentsHtml || '暂无评价'}</div>
                    </div>
                </div>
            </div>
            <div style="padding:10px;background:#fff;border-top:1px solid #eee;display:flex;gap:10px;align-items:center;">
                <div style="display:flex;flex-direction:column;align-items:center;font-size:10px;color:#666;cursor:pointer;" id="detailChatBtn">
                    <i class="fas fa-comment-dots" style="font-size:20px;color:#999;"></i>
                    客服
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;font-size:10px;color:#666;cursor:pointer;margin-right:10px;" id="detailStoreBtn">
                    <i class="fas fa-store" style="font-size:20px;color:#999;"></i>
                    店铺
                </div>
                ${this.currentMode === 'shopping' ? `<button class="shop-btn cart" id="detailCartBtn" style="flex:1;background:#ff9500;">加入购物车</button>` : ''}
                <button class="shop-btn buy" id="detailBuyBtn" style="flex:1;">${this.currentMode === 'shopping' ? '立即购买' : '立即下单'}</button>
            </div>
        `;
        document.getElementById('shopApp').appendChild(modal);

        // Lazy Load Detail & Comments if missing
        const apiConfig = window.API.getConfig();
        if(apiConfig.chatApiKey) {
            if(!item.desc || item.desc.length < 20) {
                const prompt = `请为商品"${item.title}"生成一段详细的商品描述（约100字），包括卖点、材质、适用场景等。`;
                window.API.callAI([{role:'system', content:prompt}], apiConfig).then(desc => {
                    const el = document.getElementById('productDetailDesc');
                    if(el) el.innerText = desc;
                }).catch(e => {});
            }
            
            if(!item.comments || item.comments.length === 0) {
                const prompt = `请为商品"${item.title}"生成 2 条买家评价。返回JSON数组: [{"user": "买家名", "content": "评价内容", "score": 5}]`;
                window.API.callAI([{role:'system', content:prompt}], apiConfig).then(res => {
                    try {
                        const comments = JSON.parse(res);
                        item.comments = comments;
                        const html = comments.map(c => `
                            <div style="border-bottom:1px solid #eee;padding:10px 0;">
                                <div style="display:flex;justify-content:space-between;font-size:12px;color:#999;">
                                    <span>${c.user}</span>
                                    <span>${'★'.repeat(c.score || 5)}</span>
                                </div>
                                <div style="margin-top:5px;font-size:13px;">${c.content}</div>
                            </div>
                        `).join('');
                        const el = document.getElementById('productComments');
                        if(el) el.innerHTML = html;
                    } catch(e) {}
                }).catch(e => {});
            }
        }

        modal.querySelector('#closeProductDetail').onclick = () => modal.remove();
        
        modal.querySelector('#shareProductBtn').onclick = () => this.shareProduct(item);
        
        modal.querySelector('#favProductBtn').onclick = function() {
            this.classList.toggle('fas');
            this.classList.toggle('far');
            this.style.color = this.classList.contains('fas') ? '#ff5000' : 'inherit';
            alert(this.classList.contains('fas') ? '已收藏' : '已取消收藏');
        };

        modal.querySelector('#followStoreBtn').onclick = function() {
            const isFollowed = this.innerText === '已关注';
            this.innerText = isFollowed ? '关注' : '已关注';
            this.style.background = isFollowed ? 'none' : '#ff5000';
            this.style.color = isFollowed ? '#ff5000' : '#fff';
        };

        modal.querySelector('#detailChatBtn').onclick = () => this.startChatWithSeller(item.seller);
        modal.querySelector('#detailStoreBtn').onclick = () => alert('店铺主页功能开发中');
        
        if(this.currentMode === 'shopping') {
            modal.querySelector('#detailCartBtn').onclick = () => this.addToCart(item, item.image);
        }
        
        modal.querySelector('#detailBuyBtn').onclick = () => this.buyNow(item);
    }

    shareProduct(item) {
        if(window.QQApp && window.QQApp.showActionSheet) {
            const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
            const options = [
                {
                    text: '转发给好友',
                    handler: () => {
                        if(qqData.friends.length === 0) return alert('暂无好友');
                        const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
                        const choice = prompt(`选择好友:\n${names}`);
                        const idx = parseInt(choice) - 1;
                        if(idx >= 0 && idx < qqData.friends.length) {
                            const friend = qqData.friends[idx];
                            this.sendShareMessage(friend.id, item);
                        }
                    }
                },
                {
                    text: '分享到动态',
                    handler: () => {
                        qqData.moments.unshift({
                            id: Date.now(), userId: 'user', name: qqData.user.name, avatar: qqData.user.avatar,
                            text: `推荐好物！${item.title} 只要 ¥${item.price}`, image: item.image, timestamp: Date.now(), comments: [], likes: []
                        });
                        localStorage.setItem('qq_data', JSON.stringify(qqData));
                        alert('已发布到动态');
                    }
                },
                {
                    text: '转发到推特',
                    handler: () => {
                        const tData = JSON.parse(localStorage.getItem('twitter_data') || '{"tweets":[]}');
                        tData.tweets.unshift({
                            id: Date.now(), accountId: 'main', text: `种草！${item.title} #好物推荐`, 
                            time: Date.now(), likes: 0, retweets: 0, replies: 0, images: [item.image], comments: []
                        });
                        localStorage.setItem('twitter_data', JSON.stringify(tData));
                        alert('已发布推文');
                    }
                }
            ];
            window.QQApp.showActionSheet(options);
        } else {
            // Fallback
            alert('分享功能需要 QQ 组件支持');
        }
    }

    sendShareMessage(friendId, item) {
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        if(!qqData.messages[friendId]) qqData.messages[friendId] = [];
        qqData.messages[friendId].push({
            id: Date.now(), senderId: 'user', senderName: '我', 
            content: `[分享商品] ${item.title}\n价格: ¥${item.price}`, type: 'text', timestamp: Date.now(), status: 'normal'
        });
        localStorage.setItem('qq_data', JSON.stringify(qqData));
        alert('分享成功');
    }

    addToCart(item, imgUrl) {
        this.store.update(d => d.cart.push({...item, image: imgUrl, id: Date.now()}));
        alert('已加入购物车');
    }

buyNow(item) {
    if(this.currentMode === 'takeout') {
        // ========== 外卖模式 ==========
        const useFamilyCard = localStorage.getItem('takeout_use_familycard') === 'true';

        if(useFamilyCard) {
            // 🔴 使用亲属卡支付
            localStorage.removeItem('takeout_use_familycard'); // 清除标记

            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            const familyCards = qqData.familyCards || [];

            if(familyCards.length === 0) {
                window.Utils.showToast('没有可用的亲属卡已切换为钱包支付');
                this.payWithWallet(item, 'takeout');
                return;
            }

            // 调用QQApp的亲属卡支付
            window.QQApp.useFamilyCard(item.price, `外卖: ${item.title}`);

            // 创建订单
            const orderId = Date.now();
            this.store.update(d => d.orders.push({
                id: orderId,
                items: [item],
                total: item.price,
                status: 'unshipped',
                time: Date.now(),
                type: 'takeout',
                payMethod: 'familycard'
            }));

            // 如果是给好友点的外卖
            if(this.targetReceiverId) {
                const friend = qqData.friends.find(f => f.id === this.targetReceiverId);
                if(friend) {
                    if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                    qqData.messages[friend.id].push({
                        id: Date.now(),
                        senderId: 'user',
                        senderName: qqData.user.name,
                        content: `我给你点了份外卖: ${item.title}`,
                        type: 'system_card',
                        subType: 'food',
                        data: item.price,
                        timestamp: Date.now(),
                        status: 'normal'
                    });
                    localStorage.setItem('qq_data', JSON.stringify(qqData));
                    window.Utils.showToast(`已用亲属卡下单并通知 ${friend.name}`);
                }
            } else {
                window.Utils.showToast('已用亲属卡下单！');
                this.simulateDelivery(item.title, orderId);
            }

        } else {
            // 🔴 使用钱包支付（原有逻辑）
            this.payWithWallet(item, 'takeout');
        }

    } else {
        // ========== 购物模式 ==========
        this.showPaymentMethodDialog(item);
    }
}

// 🔴 新增：支付方式选择弹窗
showPaymentMethodDialog(item) {
    const qqData = JSON.parse(localStorage.getItem('qq_data'));
    const familyCards = qqData.familyCards || [];
    const walletBalance = parseFloat(qqData.wallet.balance);

    // 构建支付选项
    let buttons = [
        {
            text: `💰 钱包支付 (余额 ¥${walletBalance.toFixed(2)})`,
            class: walletBalance >= item.price ? 'confirm' : 'secondary',
            value: 'wallet'
        }
    ];

    // 如果有亲属卡添加亲属卡选项
    if(familyCards.length > 0) {
        familyCards.forEach((card, index) => {
            const remaining = (card.limit - card.used).toFixed(2);
            const isAvailable = parseFloat(remaining) >= item.price;
            buttons.push({
                text: `💳 ${card.fromName}的亲属卡 (剩余 ¥${remaining})${!isAvailable ? ' - 余额不足' : ''}`,
                class: isAvailable ? 'secondary' : 'cancel',
                value: `card_${index}`
            });
        });
    }

    buttons.push({ text: '取消', class: 'cancel', value: false });

    window.Utils.showCustomDialog({
        title: '选择支付方式',
        content: `
            <div style="text-align:center;padding:15px 0;">
                <div style="font-size:14px;color:#666;margin-bottom:10px;">商品：${item.title}</div>
                <div style="font-size:24px;font-weight:bold;color:#ff5000;">¥${item.price}</div>
            </div>
        `,
        buttons: buttons
    }).then(res => {
        if(!res.action) return;

        if(res.action === 'wallet') {
            // 钱包支付
            if(walletBalance < item.price) {
                return window.Utils.showToast('钱包余额不足');
            }
            this.payWithWallet(item, 'buy');

        } else if(res.action.startsWith('card_')) {
            // 亲属卡支付
            const cardIndex = parseInt(res.action.split('_')[1]);
            const card = familyCards[cardIndex];
            const remaining = card.limit - card.used;

            if(remaining < item.price) {
                return window.Utils.showToast('该亲属卡余额不足');
            }

            this.payWithFamilyCard(item, cardIndex);
        }
    });
}

// 🔴 新增：使用亲属卡支付（商城购物）
payWithFamilyCard(item, cardIndex) {
    const qqData = JSON.parse(localStorage.getItem('qq_data'));
    const card = qqData.familyCards[cardIndex];

    if(!card) {
        return window.Utils.showToast('亲属卡不存在');
    }

    const remaining = card.limit - card.used;
    if(remaining < item.price) {
        return window.Utils.showToast('亲属卡余额不足');
    }

    // 执行扣款
    card.used = parseFloat((card.used + item.price).toFixed(2));
    if(!card.history) card.history = [];
    card.history.unshift({
        date: new Date().toLocaleString(),
        amount: `-${item.price.toFixed(2)}`,
        reason: `商城购物：${item.title}`
    });

    // 同时扣除角色钱包（如果有）
    const cardOwner = qqData.friends.find(f => f.id === card.fromId);
    if(cardOwner?.wallet?.enabled && cardOwner?.wallet?.initialized) {
        cardOwner.wallet.balance = (parseFloat(cardOwner.wallet.balance) - item.price).toFixed(2);
        cardOwner.wallet.history.unshift({
            date: new Date().toLocaleString(),
            amount: `-${item.price.toFixed(2)}`,
            reason: `亲属卡被使用：商城购物 - ${item.title}`
        });
    }

    localStorage.setItem('qq_data', JSON.stringify(qqData));

    // 创建订单
    const orderId = Date.now();
    this.store.update(d => d.orders.push({
        id: orderId,
        items: [item],
        total: item.price,
        status: 'unshipped',
        time: Date.now(),
        type: 'buy',
        payMethod: 'familycard',
        cardOwner: card.fromName
    }));

    // 🔴 发送通知给亲属卡所有者
    if(card.fromId && qqData.messages) {
        if(!qqData.messages[card.fromId]) qqData.messages[card.fromId] = [];
        qqData.messages[card.fromId].push({
            id: Date.now(),
            senderId: 'system',
            senderName: '系统',
            content: `${qqData.user.name} 使用了你的亲属卡在商城购买了「${item.title}」，消费 ¥${item.price.toFixed(2)}`,
            type: 'system',
            timestamp: Date.now(),
            status: 'normal'
        });
        localStorage.setItem('qq_data', JSON.stringify(qqData));
    }

    // 显示成功提示
    window.Utils.showToast(`✅ 已用${card.fromName}的亲属卡支付 ¥${item.price}`);

    // 发送系统通知
    window.System?.showNotification?.(
        '商城购物',
        `使用${card.fromName}的亲属卡支付了 ¥${item.price}`,
        '',
        'shopApp'
    );

    // 模拟发货
    setTimeout(() => {
        this.store.update(d => {
            const o = d.orders.find(x => x.id === orderId);
            if(o) o.status = 'shipped';
        });
        if(Notification.permission === 'granted') {
            new Notification('商城', {body: `您的订单 ${item.title} 已发货`});
        }
    }, 10000);
}

// 🔴 新增：钱包支付（抽取原有逻辑）
payWithWallet(item, type) {
    const qqData = JSON.parse(localStorage.getItem('qq_data'));
    const wallet = qqData.wallet;

    if(parseFloat(wallet.balance) < item.price) {
        return window.Utils.showToast('余额不足');
    }

    if(!confirm(`确定支付 ¥${item.price} 购买 ${item.title} 吗？`)) {
        return;
    }

    // 扣款
    wallet.balance = (parseFloat(wallet.balance) - parseFloat(item.price)).toFixed(2);
    wallet.history.unshift({
        date: new Date().toLocaleString(),
        amount: `-${item.price}`,
        reason: type === 'takeout' ? `外卖: ${item.title}` : `商城购物: ${item.title}`
    });
    localStorage.setItem('qq_data', JSON.stringify(qqData));

    // 创建订单
    const orderId = Date.now();
    this.store.update(d => d.orders.push({
        id: orderId,
        items: [item],
        total: item.price,
        status: 'unshipped',
        time: Date.now(),
        type: type,
        payMethod: 'wallet'
    }));

    if(type === 'takeout') {
        // 外卖逻辑
        if(this.targetReceiverId) {
            const friend = qqData.friends.find(f => f.id === this.targetReceiverId);
            if(friend) {
                if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                qqData.messages[friend.id].push({
                    id: Date.now(),
                    senderId: 'user',
                    senderName: qqData.user.name,
                    content: `我给你点了份外卖: ${item.title}`,
                    type: 'system_card',
                    subType: 'food',
                    data: item.price,
                    timestamp: Date.now(),
                    status: 'normal'
                });
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                window.Utils.showToast(`已下单并通知 ${friend.name}`);
            }
        } else {
            window.Utils.showToast('下单成功！');
            this.simulateDelivery(item.title, orderId);
        }
    } else {
        // 购物逻辑
        window.Utils.showToast('购买成功');

        // 模拟发货
        setTimeout(() => {
            this.store.update(d => {
                const o = d.orders.find(x => x.id === orderId);
                if(o) o.status = 'shipped';
            });
            if(Notification.permission === 'granted') {
                new Notification('商城', {body: `您的订单 ${item.title} 已发货`});
            }
        }, 10000);
    }
}


    renderCart() {
        const list = document.getElementById('shopCartList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.cart.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">购物车空空如也</div>';
            return;
        }

        let total = 0;
        data.cart.forEach((item, index) => {
            total += parseFloat(item.price);
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-img" style="background-image:url('${item.image}')"></div>
                <div class="cart-item-info">
                    <div>${item.title}</div>
                    <div style="color:#ff5000;font-weight:bold;">¥${item.price}</div>
                </div>
                <button class="shop-btn" style="background:#ccc;">删除</button>
            `;
            div.querySelector('button').onclick = () => {
                this.store.update(d => d.cart.splice(index, 1));
                this.renderCart();
            };
            list.appendChild(div);
        });

        document.getElementById('cartTotal').innerText = total.toFixed(2);
        
        document.getElementById('btnCartPay').onclick = () => {
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            if(parseFloat(qqData.wallet.balance) < total) return alert('余额不足');
            
            if(confirm(`确认支付 ¥${total.toFixed(2)}?`)) {
                qqData.wallet.balance = (parseFloat(qqData.wallet.balance) - total).toFixed(2);
                qqData.wallet.history.unshift({date: new Date().toLocaleString(), amount: `-${total.toFixed(2)}`, reason: `商城购物`});
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                
                const orderId = Date.now();
                this.store.update(d => {
                    d.orders.push({
                        id: orderId,
                        items: [...d.cart],
                        total: total.toFixed(2),
                        status: 'unshipped',
                        time: Date.now(),
                        type: 'buy'
                    });
                    d.cart = [];
                });
                this.renderCart();
                alert('支付成功');
                
                // Simulate shipping
                setTimeout(() => {
                    this.store.update(d => {
                        const o = d.orders.find(x => x.id === orderId);
                        if(o) o.status = 'shipped';
                    });
                    if(Notification.permission === 'granted') new Notification('商城', {body: `您的购物车订单已发货`});
                }, 10000);
            }
        };
        
        document.getElementById('btnCartPayForMe').onclick = () => {
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            if(qqData.friends.length === 0) return alert('没有好友可以代付');
            
            const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
            const choice = prompt(`找谁代付？(输入序号)\n${names}`);
            const idx = parseInt(choice) - 1;
            
            if(idx >= 0 && idx < qqData.friends.length) {
                const friend = qqData.friends[idx];
                if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                qqData.messages[friend.id].push({
                    id: Date.now(), senderId: 'sys', senderName: 'System', 
                    content: `请帮我清空购物车，总计 ¥${total.toFixed(2)}`, type: 'system_card', subType: 'payforme', data: total.toFixed(2),
                    timestamp: Date.now(), status: 'normal'
                });
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                alert(`已发送代付请求给 ${friend.name}`);
            }
        };
    }

    renderChatList() {
        const list = document.getElementById('shopChatList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.chats.length === 0) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">暂无商家消息</div>';
            return;
        }

        data.chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <div class="chat-avatar" style="background:#ff5000;color:#fff;display:flex;justify-content:center;align-items:center;"><i class="fas fa-store"></i></div>
                <div class="chat-info">
                    <div class="chat-top"><span class="chat-name">${chat.sellerName}</span></div>
                    <div class="chat-msg">${chat.messages[chat.messages.length-1]?.content || ''}</div>
                </div>
            `;
            div.onclick = () => this.openChat(chat);
            list.appendChild(div);
        });
    }

    openChat(chat) {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.zIndex = '100';
        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeShopChat"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">${chat.sellerName}</span>
            </div>
            <div class="chat-messages" id="shopChatMessages" style="flex:1;overflow-y:auto;padding:10px;"></div>
            <div class="chat-input-area">
                <input id="shopChatInput" placeholder="联系商家...">
                <button class="send-btn" id="shopChatSend">发送</button>
                <button class="chat-reply-btn" id="shopChatReply" style="margin-left:5px;">回复</button>
            </div>
        `;
        document.getElementById('shopApp').appendChild(modal);

        const renderMsgs = () => {
            const container = modal.querySelector('#shopChatMessages');
            container.innerHTML = '';
            chat.messages.forEach(m => {
                const div = document.createElement('div');
                div.className = `message-row ${m.sender === 'user' ? 'self' : ''}`;
                div.innerHTML = `<div class="msg-content"><div class="msg-bubble">${m.content}</div></div>`;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        };
        renderMsgs();

        modal.querySelector('#closeShopChat').onclick = () => modal.remove();
        
        const sendMsg = async (isReply = false) => {
            const input = modal.querySelector('#shopChatInput');
            const text = input.value.trim();
            if(!text && !isReply) return;
            
            if(!isReply) {
                chat.messages.push({sender: 'user', content: text, time: Date.now()});
                this.store.set(this.store.get()); // Save
                renderMsgs();
                input.value = '';
            }

            // AI Reply
            if(isReply || !isReply) {
                if(isReply) {
                     const apiConfig = window.API.getConfig();
                     if(apiConfig.chatApiKey) {
                         const prompt = `你扮演淘宝商家 "${chat.sellerName}"。\n用户说: "${chat.messages[chat.messages.length-1].content}"。\n请回复用户，语气要亲切客气（亲~）。`;
                         try {
                             const reply = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                             chat.messages.push({sender: 'seller', content: reply, time: Date.now()});
                             this.store.set(this.store.get());
                             renderMsgs();
                         } catch(e) { alert('生成失败'); }
                     }
                }
            }
        };

        modal.querySelector('#shopChatSend').onclick = () => sendMsg(false);
        modal.querySelector('#shopChatReply').onclick = () => sendMsg(true);
    }

    startChatWithSeller(sellerName) {
        const data = this.store.get();
        let chat = data.chats.find(c => c.sellerName === sellerName);
        if(!chat) {
            chat = { sellerName, messages: [] };
            data.chats.push(chat);
            this.store.set(data);
        }
        this.openChat(chat);
    }

    async renderMe() {
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const data = this.store.get();
        const container = document.getElementById('shop-me');
        container.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'background:#333;color:#fff;padding:30px 20px;display:flex;align-items:center;gap:15px;';
        
        let avatarUrl = qqData.user.avatar || '';
        if(avatarUrl.startsWith('img_')) {
            const blob = await window.db.getImage(avatarUrl);
            if(blob) avatarUrl = blob;
        }

        header.innerHTML = `
            <div style="width:60px;height:60px;background:#fff;border-radius:50%;background-image:url('${avatarUrl}');background-size:cover;"></div>
            <div>
                <h2 style="margin:0;">${qqData.user.name}</h2>
                <div style="font-size:12px;opacity:0.8;">会员等级: 黄金会员</div>
            </div>
        `;
        container.appendChild(header);

        // Assets
        const assets = document.createElement('div');
        assets.style.cssText = 'display:flex;justify-content:space-around;padding:15px;background:#fff;margin-bottom:10px;';
        assets.innerHTML = `
            <div style="text-align:center;"><div style="font-weight:bold;">${qqData.wallet.balance}</div><div style="font-size:12px;color:#999;">余额</div></div>
            <div style="text-align:center;"><div style="font-weight:bold;">${data.user.coupons.length}</div><div style="font-size:12px;color:#999;">优惠券</div></div>
            <div style="text-align:center;"><div style="font-weight:bold;">${data.user.points}</div><div style="font-size:12px;color:#999;">积分</div></div>
        `;
        container.appendChild(assets);

        // Orders
        const ordersDiv = document.createElement('div');
        ordersDiv.style.background = '#fff';
        ordersDiv.style.padding = '15px';
        ordersDiv.style.marginBottom = '10px';
        ordersDiv.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
                <span style="font-weight:bold;">我的订单</span>
                <span style="font-size:12px;color:#999;">全部订单 ></span>
            </div>
            <div style="display:flex;justify-content:space-around;">
                <div style="text-align:center;font-size:12px;color:#666;"><i class="fas fa-wallet" style="font-size:20px;margin-bottom:5px;"></i><br>待付款</div>
                <div style="text-align:center;font-size:12px;color:#666;"><i class="fas fa-box" style="font-size:20px;margin-bottom:5px;"></i><br>待发货</div>
                <div style="text-align:center;font-size:12px;color:#666;"><i class="fas fa-truck" style="font-size:20px;margin-bottom:5px;"></i><br>待收货</div>
                <div style="text-align:center;font-size:12px;color:#666;"><i class="fas fa-comment-alt" style="font-size:20px;margin-bottom:5px;"></i><br>待评价</div>
            </div>
        `;
        container.appendChild(ordersDiv);

        // Order List (Simplified)
        const orderList = document.createElement('div');
        orderList.style.padding = '10px';
        data.orders.slice().reverse().forEach(o => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#fff;padding:10px;margin-bottom:10px;border-radius:5px;';
            
            let actionBtn = '';
            if(o.status === 'shipped') {
                actionBtn = `<button class="shop-btn" style="padding:5px 10px;font-size:12px;">确认收货</button>`;
            } else if(o.status === 'completed' && !o.review) {
                actionBtn = `<button class="shop-btn" style="padding:5px 10px;font-size:12px;background:#ff9500;">评价</button>`;
            }

            div.innerHTML = `
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#999;margin-bottom:5px;">
                    <span>${new Date(o.time).toLocaleDateString()}</span>
                    <span>${o.status}</span>
                </div>
                <div style="display:flex;gap:10px;">
                    <div style="width:50px;height:50px;background:#eee;background-image:url('${o.items[0].image}');background-size:cover;"></div>
                    <div style="flex:1;">
                        <div>${o.items[0].title} 等${o.items.length}件</div>
                        <div style="font-weight:bold;">¥${o.total}</div>
                    </div>
                    <div style="display:flex;align-items:center;">${actionBtn}</div>
                </div>
                ${o.review ? `<div style="margin-top:5px;font-size:12px;color:#666;background:#f9f9f9;padding:5px;">评价: ${o.review}</div>` : ''}
            `;
            
            const btn = div.querySelector('button');
            if(btn) {
                btn.onclick = async () => {
                    if(o.status === 'shipped') {
                        if(confirm('确认收货吗？')) {
                            this.store.update(d => {
                                const order = d.orders.find(x => x.id === o.id);
                                if(order) order.status = 'completed';
                            });
                            this.renderMe();
                        }
                    } else if(o.status === 'completed') {
                        const apiConfig = window.API.getConfig();
                        if(apiConfig.chatApiKey) {
                            btn.innerText = '生成中...';
                            const prompt = `用户购买了 "${o.items[0].title}"。请生成一条简短的商品评价（好评）。`;
                            try {
                                const review = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                                this.store.update(d => {
                                    const order = d.orders.find(x => x.id === o.id);
                                    if(order) order.review = review;
                                });
                                this.renderMe();
                            } catch(e) { alert('生成失败'); }
                        } else {
                            const review = prompt('请输入评价:');
                            if(review) {
                                this.store.update(d => {
                                    const order = d.orders.find(x => x.id === o.id);
                                    if(order) order.review = review;
                                });
                                this.renderMe();
                            }
                        }
                    }
                };
            }

            orderList.appendChild(div);
        });
        container.appendChild(orderList);

        // More Menu
        const menuDiv = document.createElement('div');
        menuDiv.style.marginTop = '10px';
        
        const items = [
            {text: '收货地址管理', action: () => this.manageAddress()},
            {text: '我的评价', action: () => alert('暂无评价')},
            {text: '浏览足迹', action: () => alert('暂无足迹')},
            {text: '关注店铺', action: () => alert('暂无关注')}
        ];
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#fff;padding:15px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;cursor:pointer;';
            div.innerHTML = `<span>${item.text}</span><i class="fas fa-chevron-right" style="color:#ccc;"></i>`;
            div.onclick = item.action;
            menuDiv.appendChild(div);
        });
        container.appendChild(menuDiv);
    }

    manageAddress() {
        const data = this.store.get();
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.background = '#f5f5f5';
        
        const renderList = () => {
            const list = modal.querySelector('#addrList');
            list.innerHTML = '';
            data.user.addresses.forEach((addr, idx) => {
                const div = document.createElement('div');
                div.style.cssText = 'background:#fff;padding:15px;margin-bottom:10px;';
                div.innerHTML = `
                    <div style="font-weight:bold;">${addr.name} ${addr.phone}</div>
                    <div style="color:#666;font-size:12px;margin-top:5px;">${addr.address}</div>
                    <div style="text-align:right;margin-top:10px;">
                        <button class="shop-btn" style="background:#ccc;padding:2px 10px;font-size:12px;" onclick="window.ShopApp.deleteAddress(${idx})">删除</button>
                    </div>
                `;
                list.appendChild(div);
            });
        };

        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">收货地址</span>
                <i class="fas fa-plus" id="addAddrBtn" style="cursor:pointer;"></i>
            </div>
            <div id="addrList" style="padding:10px;flex:1;overflow-y:auto;"></div>
        `;
        document.getElementById('shopApp').appendChild(modal);
        renderList();
        
        modal.querySelector('#addAddrBtn').onclick = () => {
            const name = prompt('收货人:');
            const phone = prompt('手机号:');
            const address = prompt('详细地址:');
            if(name && phone && address) {
                this.store.update(d => d.user.addresses.push({name, phone, address}));
                renderList();
            }
        };
        
        // Expose delete for inline onclick
        window.ShopApp.deleteAddress = (idx) => {
            if(confirm('删除地址?')) {
                this.store.update(d => d.user.addresses.splice(idx, 1));
                renderList();
            }
        };
    }

    simulateDelivery(itemName, orderId) {
        const steps = [
            { msg: '商家已接单', delay: 2000 },
            { msg: '骑手已接单，正赶往商家', delay: 5000 },
            { msg: '骑手已取餐', delay: 10000 },
            { msg: '骑手距离您还有 500米', delay: 15000 },
            { msg: `您的外卖(${itemName})已送达，祝您用餐愉快`, delay: 20000 }
        ];
        
        steps.forEach(step => {
            setTimeout(() => {
                if(Notification.permission === 'granted') {
                    new Notification('外卖进度', { body: step.msg });
                } else {
                    console.log(step.msg);
                }
                
                if(step.msg.includes('已送达')) {
                    this.store.update(d => {
                        const o = d.orders.find(x => x.id === orderId);
                        if(o) o.status = 'completed';
                    });
                    if(document.getElementById('shop-me').style.display !== 'none') this.renderMe();
                }
            }, step.delay);
        });
    }

    async generateActivity() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const char = window.System.currentCheckedFriend;
        if(!char) return;

        const isTakeoutForUser = Math.random() > 0.7;

        if(isTakeoutForUser) {
            const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n你想给用户点一份外卖（奶茶、甜点或正餐）。\n请生成外卖名称和价格。\n返回 JSON: {"item": "外卖名", "price": 25.5}`;
            try {
                const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                const order = JSON.parse(res);
                
                alert(`(模拟) ${char.name} 给用户点了外卖: ${order.item}`);
                
                if(Notification.permission === 'granted') {
                    new Notification(char.name, { body: `给你点了外卖: ${order.item}` });
                }

            } catch(e) { console.error(e); }
        } else {
            const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请生成一个你在商城上的活动。\n可以是浏览商品、加入购物车或购买商品。\n返回 JSON: {"action": "browse/cart/buy", "item": "商品名", "price": 99.9}`;

            try {
                const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                const activity = JSON.parse(res);
                
                if(activity.action === 'cart' || activity.action === 'buy') {
                    const item = {
                        title: activity.item,
                        price: activity.price,
                        image: window.Utils.generateDefaultImage(activity.item),
                        id: Date.now()
                    };
                    
                    if(activity.action === 'cart') {
                        this.store.update(d => d.cart.push(item));
                        alert(`已将 ${activity.item} 加入购物车`);
                        if(this.currentTab === 'cart') this.renderCart();
                    } else {
                        this.store.update(d => d.orders.push({
                            id: Date.now(),
                            items: [item],
                            total: activity.price,
                            status: 'paid',
                            time: Date.now(),
                            type: 'buy'
                        }));
                        alert(`已购买 ${activity.item}`);
                    }
                } else {
                    alert(`正在浏览 ${activity.item}`);
                }
                
                if(Math.random() > 0.5) {
                    if(Notification.permission === 'granted') {
                        new Notification(char.name, { body: '在商城有了新动态' });
                    }
                }

            } catch(e) {
                console.error(e);
                alert('生成失败');
            }
        }
    }
}

window.ShopApp = new ShopApp();
