CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Other', sort_order INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO bookmarks(id,name,url,category,sort_order) VALUES
('gmail','Gmail','https://mail.google.com','Daily',0),
('calendar','Calendar','https://calendar.google.com','Daily',1),
('youtube','YouTube','https://youtube.com','Daily',2),
('chatgpt','ChatGPT','https://chatgpt.com','Daily',3),
('github','GitHub','https://github.com','Work',4),
('cloudflare','Cloudflare','https://dash.cloudflare.com','Work',5),
('shopify','Shopify','https://admin.shopify.com','Work',6),
('renn','renn.design','https://renn.design','Work',7);