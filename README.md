# Venera to PicaComic Converter

针对Venera归档，将本地收藏夹数据迁移回至PicaComic的问题：将Venera应用的备份数据转换为 PicaComic v4.2.11 可导入的格式。

> **注意**: 这是一个早期实验性工具，完全由AI辅助生成。经个人测试，收藏夹数据转换效果基本达到(部分漫画可能出现无法正常打开报错)。

## 下载

- **预编译版本**: [Releases](https://github.com/LeoKex/venera-to-pica/releases) 中下载打包好的压缩包。
- **源码运行**: 克隆仓库后自行安装依赖运行

## 功能

- 收藏夹数据转换（保持原始文件夹名称）

## 已知问题

- 部分漫画打开报 404 错误（漫画源类型映射不完全匹配）
- 仅支持 picacg、ehentai、jm、hitomi、nhentai 等主要源
- 会出现一直加载，无法自动结束。

## 使用方法

### 方法一：拖拽文件（推荐）

将 `data.venera` 文件拖拽到 `convert.bat` 上，等待转换完成。

### 方法二：命令行

```bash
npm install
node convert_v4.js "path\to\data.venera" "path\to\output.picadata"
```

## 导入到 PicaComic

1. 将生成的 `userData.picadata` 保存
2. 打开 PicaComic v4.2.11
3. 进入 **设置** → **数据** → **导入数据**
4. 选择 `userData.picadata`
5. 耐心等待加载一段时间，手动取消，检查收藏夹内容。

## 常见问题

| 问题 | 解决方法 |
|------|----------|
| 404 错误 | 漫画源类型不匹配或漫画已下架 |
| WebDAV 同步失败 | 在 PicaComic 中重新配置 WebDAV |
| 导入后空白 | 重启 PicaComic |
| 卡在加载 | 等待一段时间手动取消，收藏夹数据已导入|

## 漫画源类型映射

| Venera | PicaComic | 来源 |
|--------|-----------|------|
| 553570794 | 0 | picacg |
| 385625716 | 1 | ehentai |
| 769844263 | 2 | jm |
| 258019538 | 3 | hitomi |
| 264196719 | 6 | nhentai |

## 系统要求

- Windows 7/8/10/11
- Node.js 16+（源码运行需要）

## 许可证

MIT License

## 致谢

- [Venera](https://github.com/venera-app/venera) - 原始数据格式参考
- [PicaComic](https://github.com/ccbkv/PicaComic) - 目标数据格式参考
