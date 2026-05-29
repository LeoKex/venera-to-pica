# Venera to PicaComic Converter

将 Venera 漫画应用的用户数据转换为 PicaComic v4.2.11 可导入的格式。

> **注意**: 这是一个早期实验性工具，转换效果有限，部分漫画可能无法正常打开。欢迎提交 Issue 和 PR 来改进。

[English](#features) | [中文](#功能)

## 功能

- 收藏夹数据转换（保持原始文件夹名称）
- 历史记录转换
- 漫画源配置迁移
- 登录 Cookies 迁移
- WebDAV 配置检测

## 已知问题

- **部分漫画打开报 404 错误**: 由于 Venera 和 PicaComic 的漫画源类型映射不完全匹配，部分漫画在导入后可能无法正常打开
- **漫画源类型覆盖不全**: 目前仅支持 picacg、ehentai、jm、hitomi、nhentai 等主要源，其他源的类型可能转换不正确
- **这是个人使用的粗糙工具**: 功能不完善，仅作为初步尝试

## Requirements

- Windows 7/8/10/11
- [Node.js](https://nodejs.org/) 16+

## Installation

```bash
git clone https://github.com/LeoKex/venera-to-pica.git
cd venera-to-pica
npm install
```

## Usage

### Method 1: Drag and Drop (Recommended)

Drag your `data.venera` file onto `convert.bat` and wait for conversion.

### Method 2: Command Line

```bash
node convert_v4.js "path\to\data.venera" "path\to\output.picadata"
```

Example:
```bash
node convert_v4.js "C:\Users\You\Downloads\data.venera" "C:\Users\You\Desktop\userData.picadata"
```

### Method 3: Double-click

1. Double-click `convert.bat`
2. Follow the prompts to input file path
3. Press Enter to start conversion

## Output

- `userData.picadata` - Ready to import into PicaComic

## Import to PicaComic

1. Copy `userData.picadata` to your phone
2. Open PicaComic v4.2.11
3. Go to **Settings** → **Data** → **Import Data**
4. Select `userData.picadata`
5. Login with the same account as Venera
6. Reconfigure WebDAV if needed in **Settings** → **Data Sync**

## Troubleshooting

### 404 Error

If comics show 404 error after import:

1. **Comic source type mismatch** - The tool attempts to convert types, but may not be fully accurate
2. **Account mismatch** - Make sure PicaComic uses the same account as Venera
3. **Comic removed** - Some comics may have been removed from the platform

### WebDAV Sync Failed

After importing data, reconfigure WebDAV in PicaComic:

1. Go to **Settings** → **Data Sync**
2. Enter your WebDAV URL, username, and password
3. Test the connection

### Blank Screen After Import

Restart PicaComic app.

## Technical Details

- Node.js + better-sqlite3 for SQLite database processing
- PowerShell for ZIP compression/extraction
- Output format compatible with PicaComic v4.2.11

## Comic Source Type Mapping

| Venera Type | PicaComic Type | Source |
|-------------|----------------|--------|
| 553570794 | 0 | picacg |
| 385625716 | 1 | ehentai |
| 769844263 | 2 | jm |
| 258019538 | 3 | hitomi |
| 264196719 | 6 | nhentai |

## Project Structure

```
├── convert.bat         # Windows batch script
├── convert_v4.js       # Main conversion script
├── package.json        # Dependencies
└── README.md           # Documentation
```

## License

MIT License

## Contributing

Issues and Pull Requests are welcome!

---

## 功能

- 收藏夹数据转换（保持原始分类名称）
- 历史记录转换
- 漫画源配置转换
- 登录 Cookies 迁移
- WebDAV 配置识别

## 已知问题

- **部分漫画打开报 404 错误**: 漫画源类型映射不完全匹配
- **漫画源类型覆盖不全**: 仅支持主要源，其他源可能转换不正确
- **这是个人使用的粗糙工具**: 功能不完善，仅作为初步尝试

## 系统要求

- Windows 7/8/10/11
- [Node.js](https://nodejs.org/) 16+

## 安装

```bash
git clone https://github.com/LeoKex/venera-to-pica.git
cd venera-to-pica
npm install
```

## 使用方法

### 方法一：拖拽文件（推荐）

将 `data.venera` 文件拖拽到 `convert.bat` 上，等待转换完成。

### 方法二：命令行

```bash
node convert_v4.js "path\to\data.venera" "path\to\output.picadata"
```

### 方法三：双击运行

1. 双击 `convert.bat`
2. 按提示输入文件路径
3. 按 Enter 开始转换

## 导入到 PicaComic

1. 将 `userData.picadata` 复制到手机
2. 打开 PicaComic v4.2.11
3. 进入 **我的** → **设置** → **数据** → **导入数据**
4. 选择 `userData.picadata`
5. 使用与 Venera 相同的账号登录
6. 如需 WebDAV 同步，在 **设置** → **数据同步** 中配置

## 常见问题

### 404 错误

导入后点击漫画出现 404 错误，可能原因：

1. **漫画源类型不匹配** - 工具会尝试转换类型，但可能不完全准确
2. **账号不匹配** - 确保 PicaComic 使用与 Venera 相同的账号登录
3. **漫画已下架** - 部分漫画可能已被平台删除

### WebDAV 同步失败

导入数据后需要在 PicaComic 中重新配置 WebDAV。

### 导入后显示空白

重启 PicaComic 应用即可。

## 许可证

MIT License

## 致谢

- [Venera](https://github.com/venera-app/venera) - 原始数据格式参考
- [PicaComic](https://github.com/ccbkv/PicaComic) - 目标数据格式参考
