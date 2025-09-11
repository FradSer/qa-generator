-- 初始化数据库脚本
-- AI微调数据集生成器

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 设置数据库编码
\echo 'Initializing QA Generator database...'

-- 创建基本索引（如果需要的话，表会由SQLAlchemy自动创建）
-- 这里可以添加一些初始数据或索引优化

\echo 'Database initialization completed.'