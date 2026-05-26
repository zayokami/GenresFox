/**
 * i18n.js - Internationalization Module for GenresFox
 * Handles language detection, translation, and localization
 */

const I18n = (function () {
    'use strict';

    // Fallback messages for when Chrome i18n API is unavailable
    const _fallbackMessages = {
        "zh_CN": {
            "languageLabel": "界面语言",
            "languageFollowBrowser": "跟随浏览器设置",
            "appTitle": "GenresFox",
            "searchPlaceholder": "搜索...",
            "searchActionLabel": "搜索",
            "settingsTitle": "设置",
            "tabWallpaper": "壁纸",
            "tabSearch": "搜索与快捷方式",
            "tabAccessibility": "无障碍",
            "tabAbout": "关于",
            "uploadWallpaper": "上传壁纸",
            "resetWallpaper": "恢复默认",
            "customEngines": "自定义搜索引擎",
            "shortcuts": "快捷方式",
            "add": "添加",
            "dragDropText": "拖拽图片到此处或点击上传",
            "wallpaperSettings": "壁纸设置",
            "blurAmount": "模糊程度",
            "vignetteAmount": "暗角程度",
            "resetShortcuts": "重置快捷方式",
            "shortcutOpenCurrent": "当前页面打开",
            "shortcutOpenNewTab": "新标签页打开",
            "searchBoxSettings": "搜索框设置",
            "searchBoxWidth": "宽度",
            "searchBoxScale": "大小",
            "searchBoxPosition": "垂直位置",
            "searchBoxRadius": "圆角",
            "searchBoxShadow": "阴影强度",
            "showShortcutNames": "显示快捷方式名称",
            "shortcutDragHint": "💡 拖拽快捷方式可调整顺序",
            "livePreview": "实时预览",
            "a11yDisplay": "显示",
            "a11yTheme": "主题",
            "a11yThemeStandard": "标准",
            "a11yThemeHCDark": "高对比度 (深色)",
            "a11yThemeHCLight": "高对比度 (浅色)",
            "a11yThemeYellowBlack": "黄底黑字",
            "a11yFontSize": "字体大小",
            "a11yFontFamily": "字体",
            "a11yFontDefault": "默认",
            "a11yFontSans": "无衬线",
            "a11yFontSerif": "衬线",
            "a11yFontDyslexic": "阅读障碍友好",
            "a11yLineSpacing": "行间距",
            "a11ySpacingNormal": "正常",
            "a11ySpacingRelaxed": "宽松",
            "a11ySpacingVeryRelaxed": "很宽松",
            "a11yLetterSpacing": "字母间距",
            "a11yWordSpacing": "单词间距",
            "a11ySpacingWide": "较宽",
            "a11ySpacingWider": "很宽",
            "a11yKeyboardShortcuts": "键盘快捷键",
            "a11yShowShortcuts": "显示键盘快捷键",
            "switchEnginePrev": "切换到上一个搜索引擎",
            "switchEngineNext": "切换到下一个搜索引擎",
            "focusSearch": "聚焦搜索框",
            "openSettings": "打开设置",
            "closeModal": "关闭对话框",
            "navigate": "在元素间导航",
            "activate": "激活按钮或链接",
            "a11yMotion": "动画",
            "a11yAnimations": "动画效果",
            "a11yMotionFull": "完整",
            "a11yMotionReduced": "减少",
            "a11yMotionNone": "无",
            "a11yFocus": "焦点",
            "a11yFocusIndicator": "焦点指示器",
            "a11yFocusStandard": "标准",
            "a11yFocusEnhanced": "增强",
            "a11yFocusLarge": "大型",
            "a11yReset": "恢复默认设置",
            "aboutDescription": "一个完全开源、高性能、极简的浏览器新标签页扩展。",
            "aboutOpenSource": "GenresFox 是一个开源项目，你可以在 GitHub 上找到源代码！",
            "viewOnGitHub": "在 GitHub 上查看",
            "creditsTitle": "致谢",
            "creditsBingWallpaper": "默认壁纸由 Bing 每日壁纸提供。",
            "processingImage": "正在处理图片...",
            "processingLoading": "加载图片中...",
            "processingOptimizing": "优化中...",
            "processingCompressing": "压缩中...",
            "processingSaving": "保存中...",
            "processingStarting": "开始处理...",
            "errorImageTooLarge": "图片文件过大（最大 50MB）",
            "errorResolutionTooHigh": "图片分辨率过高（最大 8000 万像素）",
            "resetToBing": "已切换到 Bing 每日壁纸",
            "deleteShortcutConfirm": "确认删除快捷方式“%s”？",
            "searchErrorUnsafeUrl": "无法访问此网址，可能不安全。",
            "searchErrorNavigationFailed": "链接打开失败。",
            "searchErrorNoEngine": "没有可用的搜索引擎。",
            "searchErrorNoInput": "搜索输入框不可用。",
            "searchErrorInvalidInput": "请输入有效的搜索内容。",
            "searchErrorInvalidEngine": "搜索引擎 URL 无效。",
            "searchErrorQueryTooLong": "搜索内容过长。",
            "searchErrorBuildUrl": "构建搜索 URL 失败。",
            "searchErrorUnexpected": "发生意外错误，请重试。",
            "searchErrorInitFailed": "搜索栏初始化失败。",
            "themeSectionTitle": "主题",
            "themeUseWallpaperAccent": "使用壁纸主色作为主题色",
            "snowEffectToggle": "雪花效果",
            "stickyNotes": "便签",
            "addStickyNote": "添加便签",
            "clearAllStickyNotes": "清除全部",
            "clearAllStickyNotesConfirm": "清除所有便签？",
            "deleteStickyNote": "删除便签",
            "enableStickyNotes": "启用便签",
            "stickyNotePlaceholder": "在此输入...",
            "folderDefault": "文件夹",
            "folderRemove": "移除",
            "folderExtract": "提取",
            "folderDisband": "解散文件夹",
            "dragOverMerge": "按住以合并到文件夹",
            "bringToFront": "置于顶层",
            "stickyNoteFontSettings": "字体设置",
            "stickyNoteFontSize": "字号",
            "stickyNoteLetterSpacing": "字间距",
            "stickyNoteLineHeight": "行高",
            "exportConfigTitle": "导出配置",
            "exportConfigDescription": "将所有设置、快捷方式和自定义项导出为 JSON 文件，用于备份或分享。",
            "exportConfigButton": "导出配置",
            "exportConfigSuccess": "配置导出成功！",
            "exportConfigError": "配置导出失败。",
            "importConfigButton": "导入配置",
            "importConfigConfirm": "这将替换您当前的所有设置。是否继续？",
            "importConfigSuccess": "配置导入成功！",
            "importConfigError": "配置导入失败："
        },
        "en": {
            "languageLabel": "Interface Language",
            "languageFollowBrowser": "Follow browser language",
            "appTitle": "GenresFox",
            "searchPlaceholder": "Search...",
            "searchActionLabel": "Search",
            "settingsTitle": "Settings",
            "tabWallpaper": "Wallpaper",
            "tabSearch": "Search & Shortcuts",
            "tabAccessibility": "Accessibility",
            "tabAbout": "About",
            "uploadWallpaper": "Upload Wallpaper",
            "resetWallpaper": "Reset to Default",
            "customEngines": "Custom Search Engines",
            "shortcuts": "Shortcuts",
            "add": "Add",
            "dragDropText": "Drag & Drop image here or click to upload",
            "wallpaperSettings": "Wallpaper Settings",
            "blurAmount": "Blur Amount",
            "vignetteAmount": "Vignette Amount",
            "resetShortcuts": "Reset Shortcuts",
            "shortcutOpenCurrent": "Open in current tab",
            "shortcutOpenNewTab": "Open in new tab",
            "searchBoxSettings": "Search Box Settings",
            "searchBoxWidth": "Width",
            "searchBoxScale": "Size",
            "searchBoxPosition": "Vertical Position",
            "searchBoxRadius": "Corner Radius",
            "searchBoxShadow": "Shadow Strength",
            "showShortcutNames": "Show shortcut names",
            "shortcutDragHint": "💡 Drag shortcuts to reorder them",
            "livePreview": "Live Preview",
            "a11yDisplay": "Display",
            "a11yTheme": "Theme",
            "a11yThemeStandard": "Standard",
            "a11yThemeHCDark": "High Contrast (Dark)",
            "a11yThemeHCLight": "High Contrast (Light)",
            "a11yThemeYellowBlack": "Yellow on Black",
            "a11yFontSize": "Font Size",
            "a11yFontFamily": "Font Family",
            "a11yFontDefault": "Default",
            "a11yFontSans": "Sans-serif",
            "a11yFontSerif": "Serif",
            "a11yFontDyslexic": "OpenDyslexic",
            "a11yLineSpacing": "Line Spacing",
            "a11yLetterSpacing": "Letter Spacing",
            "a11yWordSpacing": "Word Spacing",
            "a11ySpacingNormal": "Normal",
            "a11ySpacingRelaxed": "Relaxed",
            "a11ySpacingVeryRelaxed": "Very Relaxed",
            "a11ySpacingWide": "Wide",
            "a11ySpacingWider": "Wider",
            "a11yMotion": "Motion",
            "a11yAnimations": "Animations",
            "a11yMotionFull": "Full",
            "a11yMotionReduced": "Reduced",
            "a11yMotionNone": "None",
            "a11yFocus": "Focus",
            "a11yFocusIndicator": "Focus Indicator",
            "a11yFocusStandard": "Standard",
            "a11yFocusEnhanced": "Enhanced",
            "a11yFocusLarge": "Large",
            "a11yKeyboardShortcuts": "Keyboard Shortcuts",
            "a11yShowShortcuts": "Show Keyboard Shortcuts",
            "a11yReset": "Reset to Defaults",
            "aboutDescription": "A completely open-source, high-performance, and extremely minimalist browser new tab page extension.",
            "aboutOpenSource": "GenresFox is an open-source project. You can find the source code on GitHub!",
            "viewOnGitHub": "View on GitHub",
            "creditsTitle": "Credits",
            "creditsBingWallpaper": "Default wallpaper powered by Bing Daily Wallpaper.",
            "processingImage": "Processing image...",
            "processingLoading": "Loading image...",
            "processingOptimizing": "Optimizing...",
            "processingCompressing": "Compressing...",
            "processingSaving": "Saving...",
            "processingStarting": "Starting...",
            "errorImageTooLarge": "Image file too large (max 50MB)",
            "errorResolutionTooHigh": "Image resolution too high (max 80 megapixels)",
            "resetToBing": "Switched to Bing Daily Wallpaper",
            "deleteShortcutConfirm": "Delete shortcut \"%s\"?",
            "searchErrorUnsafeUrl": "This URL may be unsafe.",
            "searchErrorNavigationFailed": "Failed to open the link.",
            "searchErrorNoEngine": "No available search engine.",
            "searchErrorNoInput": "Search input not available.",
            "searchErrorInvalidInput": "Please enter a valid search query.",
            "searchErrorInvalidEngine": "Search engine URL is invalid.",
            "searchErrorQueryTooLong": "Search query is too long.",
            "searchErrorBuildUrl": "Failed to build search URL.",
            "searchErrorUnexpected": "An unexpected error occurred. Please try again.",
            "searchErrorInitFailed": "Search bar initialization failed.",
            "themeSectionTitle": "Theme",
            "themeUseWallpaperAccent": "Use wallpaper colors as accent",
            "snowEffectToggle": "Snow Effect",
            "stickyNotes": "Sticky Notes",
            "addStickyNote": "Add Note",
            "clearAllStickyNotes": "Clear All",
            "clearAllStickyNotesConfirm": "Clear all sticky notes?",
            "deleteStickyNote": "Delete note",
            "enableStickyNotes": "Enable sticky notes",
            "stickyNotePlaceholder": "Type here...",
            "folderDefault": "Folder",
            "folderRemove": "Remove",
            "folderExtract": "Extract",
            "folderDisband": "Disband Folder",
            "dragOverMerge": "Hold to merge into folder",
            "bringToFront": "Bring to Front",
            "stickyNoteFontSettings": "Font Settings",
            "stickyNoteFontSize": "Size",
            "stickyNoteLetterSpacing": "Spacing",
            "stickyNoteLineHeight": "Line Height",
            "exportConfigTitle": "Export Configuration",
            "exportConfigDescription": "Export all your settings, shortcuts, and customizations to a JSON file for backup or sharing.",
            "exportConfigButton": "Export Configuration",
            "exportConfigSuccess": "Configuration exported successfully!",
            "exportConfigError": "Failed to export configuration.",
            "importConfigButton": "Import Configuration",
            "importConfigConfirm": "This will replace all your current settings. Continue?",
            "importConfigSuccess": "Configuration imported successfully!",
            "importConfigError": "Failed to import configuration: "
        },
        "zh_TW": {
            "languageLabel": "介面語言",
            "languageFollowBrowser": "跟隨瀏覽器設定",
            "appTitle": "GenresFox",
            "searchPlaceholder": "搜尋...",
            "searchActionLabel": "搜尋",
            "settingsTitle": "設定",
            "tabWallpaper": "桌布",
            "tabSearch": "搜尋與捷徑",
            "tabAccessibility": "無障礙",
            "tabAbout": "關於",
            "uploadWallpaper": "上傳桌布",
            "resetWallpaper": "恢復預設",
            "customEngines": "自訂搜尋引擎",
            "shortcuts": "捷徑",
            "add": "新增",
            "dragDropText": "拖曳圖片到此處或點擊上傳",
            "wallpaperSettings": "桌布設定",
            "blurAmount": "模糊程度",
            "vignetteAmount": "暗角程度",
            "resetShortcuts": "重設捷徑",
            "shortcutOpenCurrent": "在當前頁面開啟",
            "shortcutOpenNewTab": "在新分頁開啟",
            "searchBoxSettings": "搜尋框設定",
            "searchBoxWidth": "寬度",
            "searchBoxScale": "大小",
            "searchBoxPosition": "垂直位置",
            "searchBoxRadius": "圓角",
            "searchBoxShadow": "陰影強度",
            "showShortcutNames": "顯示捷徑名稱",
            "shortcutDragHint": "💡 拖曳捷徑可調整順序",
            "livePreview": "即時預覽",
            "a11yDisplay": "顯示",
            "a11yTheme": "主題",
            "a11yThemeStandard": "標準",
            "a11yThemeHCDark": "高對比 (深色)",
            "a11yThemeHCLight": "高對比 (淺色)",
            "a11yThemeYellowBlack": "黃底黑字",
            "a11yFontSize": "字型大小",
            "a11yFontFamily": "字型",
            "a11yFontDefault": "預設",
            "a11yFontSans": "無襯線",
            "a11yFontSerif": "襯線",
            "a11yFontDyslexic": "閱讀障礙友善",
            "a11yLineSpacing": "行距",
            "a11ySpacingNormal": "正常",
            "a11ySpacingRelaxed": "寬鬆",
            "a11ySpacingVeryRelaxed": "非常寬鬆",
            "a11yLetterSpacing": "字母間距",
            "a11yWordSpacing": "單詞間距",
            "a11ySpacingWide": "較寬",
            "a11ySpacingWider": "很寬",
            "a11yKeyboardShortcuts": "鍵盤快捷鍵",
            "a11yShowShortcuts": "顯示鍵盤快捷鍵",
            "switchEnginePrev": "切換到上一個搜索引擎",
            "switchEngineNext": "切換到下一個搜索引擎",
            "focusSearch": "聚焦搜索框",
            "openSettings": "打開設置",
            "closeModal": "關閉對話框",
            "navigate": "在元素間導航",
            "activate": "激活按鈕或鏈接",
            "a11yMotion": "動畫",
            "a11yAnimations": "動畫效果",
            "a11yMotionFull": "完整",
            "a11yMotionReduced": "減少",
            "a11yMotionNone": "無",
            "a11yFocus": "焦點",
            "a11yFocusIndicator": "焦點指示器",
            "a11yFocusStandard": "標準",
            "a11yFocusEnhanced": "增強",
            "a11yFocusLarge": "大型",
            "a11yReset": "恢復預設設定",
            "aboutDescription": "一個完全開源、高效能、極簡的瀏覽器新分頁擴充功能。",
            "aboutOpenSource": "GenresFox 是一個開源專案，你可以在 GitHub 上找到原始碼！",
            "viewOnGitHub": "在 GitHub 上查看",
            "creditsTitle": "致謝",
            "creditsBingWallpaper": "預設桌布由 Bing 每日桌布提供。",
            "processingImage": "正在處理圖片...",
            "processingLoading": "載入圖片中...",
            "processingOptimizing": "優化中...",
            "processingCompressing": "壓縮中...",
            "processingSaving": "儲存中...",
            "processingStarting": "開始處理...",
            "errorImageTooLarge": "圖片檔案過大（最大 50MB）",
            "errorResolutionTooHigh": "圖片解析度過高（最大 8000 萬像素）",
            "resetToBing": "已切換到 Bing 每日桌布",
            "deleteShortcutConfirm": "確認刪除捷徑「%s」？",
            "searchErrorUnsafeUrl": "無法訪問此網址，可能不安全。",
            "searchErrorNavigationFailed": "連結開啟失敗。",
            "searchErrorNoEngine": "沒有可用的搜尋引擎。",
            "searchErrorNoInput": "搜尋輸入框不可用。",
            "searchErrorInvalidInput": "請輸入有效的搜尋內容。",
            "searchErrorInvalidEngine": "搜尋引擎 URL 無效。",
            "searchErrorQueryTooLong": "搜尋內容過長。",
            "searchErrorBuildUrl": "建構搜尋 URL 失敗。",
            "searchErrorUnexpected": "發生意外錯誤，請重試。",
            "searchErrorInitFailed": "搜尋列初始化失敗。",
            "themeSectionTitle": "主題",
            "themeUseWallpaperAccent": "使用桌布主色作為主題色",
            "snowEffectToggle": "雪花效果",
            "stickyNotes": "便籤",
            "addStickyNote": "新增便籤",
            "clearAllStickyNotes": "清除全部",
            "clearAllStickyNotesConfirm": "清除所有便籤？",
            "deleteStickyNote": "刪除便籤",
            "enableStickyNotes": "啟用便籤",
            "stickyNotePlaceholder": "在此輸入...",
            "folderDefault": "資料夾",
            "folderRemove": "移除",
            "folderExtract": "提取",
            "folderDisband": "解散資料夾",
            "dragOverMerge": "按住以合併到資料夾",
            "bringToFront": "置於頂層",
            "stickyNoteFontSettings": "字型設定",
            "stickyNoteFontSize": "字級",
            "stickyNoteLetterSpacing": "字距",
            "stickyNoteLineHeight": "行高",
            "exportConfigTitle": "匯出設定",
            "exportConfigDescription": "將所有設定、捷徑和自訂項目匯出為 JSON 檔案，用於備份或分享。",
            "exportConfigButton": "匯出設定",
            "exportConfigSuccess": "設定匯出成功！",
            "exportConfigError": "設定匯出失敗。",
            "importConfigButton": "匯入設定",
            "importConfigConfirm": "這將替換您目前的所有設定。是否繼續？",
            "importConfigSuccess": "設定匯入成功！",
            "importConfigError": "設定匯入失敗："
        },
        "ja": {
            "languageLabel": "インターフェース言語",
            "languageFollowBrowser": "ブラウザーの言語に合わせる",
            "appTitle": "GenresFox",
            "searchPlaceholder": "検索...",
            "searchActionLabel": "検索",
            "settingsTitle": "設定",
            "tabWallpaper": "壁紙",
            "tabSearch": "検索とショートカット",
            "tabAccessibility": "アクセシビリティ",
            "tabAbout": "について",
            "uploadWallpaper": "壁紙をアップロード",
            "resetWallpaper": "デフォルトに戻す",
            "customEngines": "カスタム検索エンジン",
            "shortcuts": "ショートカット",
            "add": "追加",
            "dragDropText": "画像をドラッグ＆ドロップまたはクリックしてアップロード",
            "wallpaperSettings": "壁紙設定",
            "blurAmount": "ぼかし量",
            "vignetteAmount": "ビネット量",
            "resetShortcuts": "ショートカットをリセット",
            "shortcutOpenCurrent": "現在のタブで開く",
            "shortcutOpenNewTab": "新しいタブで開く",
            "searchBoxSettings": "検索ボックス設定",
            "searchBoxWidth": "幅",
            "searchBoxScale": "サイズ",
            "searchBoxPosition": "垂直位置",
            "searchBoxRadius": "角丸",
            "searchBoxShadow": "影の強さ",
            "showShortcutNames": "ショートカット名を表示",
            "shortcutDragHint": "💡 ショートカットをドラッグして並べ替え",
            "livePreview": "ライブプレビュー",
            "a11yDisplay": "表示",
            "a11yTheme": "テーマ",
            "a11yThemeStandard": "標準",
            "a11yThemeHCDark": "ハイコントラスト (ダーク)",
            "a11yThemeHCLight": "ハイコントラスト (ライト)",
            "a11yThemeYellowBlack": "黄色に黒",
            "a11yFontSize": "フォントサイズ",
            "a11yFontFamily": "フォント",
            "a11yFontDefault": "デフォルト",
            "a11yFontSans": "サンセリフ",
            "a11yFontSerif": "セリフ",
            "a11yFontDyslexic": "ディスレクシア対応",
            "a11yLineSpacing": "行間",
            "a11ySpacingNormal": "標準",
            "a11ySpacingRelaxed": "広め",
            "a11ySpacingVeryRelaxed": "とても広め",
            "a11yLetterSpacing": "文字間隔",
            "a11yWordSpacing": "単語間隔",
            "a11ySpacingWide": "広め",
            "a11ySpacingWider": "とても広め",
            "a11yKeyboardShortcuts": "キーボードショートカット",
            "a11yShowShortcuts": "キーボードショートカットを表示",
            "switchEnginePrev": "前の検索エンジンに切り替え",
            "switchEngineNext": "次の検索エンジンに切り替え",
            "focusSearch": "検索ボックスにフォーカス",
            "openSettings": "設定を開く",
            "closeModal": "モーダルを閉じるまたはキャンセル",
            "navigate": "要素間を移動",
            "activate": "ボタンまたはリンクをアクティブ化",
            "a11yMotion": "モーション",
            "a11yAnimations": "アニメーション",
            "a11yMotionFull": "フル",
            "a11yMotionReduced": "軽減",
            "a11yMotionNone": "なし",
            "a11yFocus": "フォーカス",
            "a11yFocusIndicator": "フォーカスインジケーター",
            "a11yFocusStandard": "標準",
            "a11yFocusEnhanced": "強調",
            "a11yFocusLarge": "大",
            "a11yReset": "デフォルトに戻す",
            "aboutDescription": "完全オープンソース、高性能、極めてミニマルなブラウザ新規タブページ拡張機能。",
            "aboutOpenSource": "GenresFox はオープンソースプロジェクトです。GitHub でソースコードを見つけることができます！",
            "viewOnGitHub": "GitHub で見る",
            "creditsTitle": "クレジット",
            "creditsBingWallpaper": "デフォルト壁紙は Bing 日替わり壁紙です。",
            "processingImage": "画像を処理中...",
            "processingLoading": "画像を読み込み中...",
            "processingOptimizing": "最適化中...",
            "processingCompressing": "圧縮中...",
            "processingSaving": "保存中...",
            "processingStarting": "開始中...",
            "errorImageTooLarge": "画像ファイルが大きすぎます（最大 50MB）",
            "errorResolutionTooHigh": "画像の解像度が高すぎます（最大 8000 万画素）",
            "resetToBing": "Bing 日替わり壁紙に切り替えました",
            "deleteShortcutConfirm": "ショートカット「%s」を削除しますか？",
            "searchErrorUnsafeUrl": "この URL は安全ではありません。",
            "searchErrorNavigationFailed": "リンクを開けませんでした。",
            "searchErrorNoEngine": "検索エンジンがありません。",
            "searchErrorNoInput": "検索欄が使えません。",
            "searchErrorInvalidInput": "検索内容を入力してください。",
            "searchErrorInvalidEngine": "検索エンジンの URL が正しくありません。",
            "searchErrorQueryTooLong": "検索内容が長すぎます。",
            "searchErrorBuildUrl": "検索 URL の作成に失敗しました。",
            "searchErrorUnexpected": "エラーが発生しました。再試行してください。",
            "searchErrorInitFailed": "検索欄の初期化に失敗しました。",
            "themeSectionTitle": "テーマ",
            "themeUseWallpaperAccent": "壁紙の主色をアクセントに使う",
            "snowEffectToggle": "雪のエフェクト",
            "stickyNotes": "付箋",
            "addStickyNote": "メモを追加",
            "clearAllStickyNotes": "すべて消去",
            "clearAllStickyNotesConfirm": "すべての付箋を消去しますか？",
            "deleteStickyNote": "メモを削除",
            "enableStickyNotes": "付箋を有効化",
            "stickyNotePlaceholder": "ここに入力...",
            "folderDefault": "フォルダ",
            "folderRemove": "削除",
            "folderExtract": "抽出",
            "folderDisband": "フォルダを解散",
            "dragOverMerge": "フォルダにマージするには長押し",
            "bringToFront": "最前面に移動",
            "stickyNoteFontSettings": "フォント設定",
            "stickyNoteFontSize": "サイズ",
            "stickyNoteLetterSpacing": "字間",
            "stickyNoteLineHeight": "行間",
            "exportConfigTitle": "設定のエクスポート",
            "exportConfigDescription": "設定を JSON ファイルにエクスポートしてバックアップできます。",
            "exportConfigButton": "設定をエクスポート",
            "exportConfigSuccess": "設定のエクスポートに成功しました！",
            "exportConfigError": "設定のエクスポートに失敗しました。",
            "importConfigButton": "設定をインポート",
            "importConfigConfirm": "現在の設定が上書きされます。続行しますか？",
            "importConfigSuccess": "設定のインポートに成功しました！",
            "importConfigError": "設定のインポートに失敗しました："
        },
        "es": {
            "languageLabel": "Idioma de la interfaz",
            "languageFollowBrowser": "Seguir el idioma del navegador",
            "appTitle": "GenresFox",
            "searchPlaceholder": "Buscar...",
            "searchActionLabel": "Buscar",
            "settingsTitle": "Ajustes",
            "tabWallpaper": "Fondo",
            "tabSearch": "Búsqueda y accesos",
            "tabAccessibility": "Accesibilidad",
            "tabAbout": "Acerca de",
            "uploadWallpaper": "Subir fondo",
            "resetWallpaper": "Restablecer por defecto",
            "customEngines": "Motores de búsqueda personalizados",
            "shortcuts": "Accesos directos",
            "add": "Añadir",
            "dragDropText": "Arrastra una imagen aquí o haz clic para subirla",
            "wallpaperSettings": "Ajustes de fondo",
            "blurAmount": "Desenfoque",
            "vignetteAmount": "Viñeta",
            "resetShortcuts": "Restablecer accesos",
            "shortcutOpenCurrent": "Abrir en la pestaña actual",
            "shortcutOpenNewTab": "Abrir en nueva pestaña",
            "searchBoxSettings": "Ajustes de la caja de búsqueda",
            "searchBoxWidth": "Ancho",
            "searchBoxScale": "Tamaño",
            "searchBoxPosition": "Posición vertical",
            "searchBoxRadius": "Radio de esquina",
            "searchBoxShadow": "Intensidad de sombra",
            "showShortcutNames": "Mostrar nombres de accesos",
            "shortcutDragHint": "💡 Arrastra accesos para reordenar",
            "livePreview": "Vista previa en vivo",
            "a11yDisplay": "Pantalla",
            "a11yTheme": "Tema",
            "a11yThemeStandard": "Estándar",
            "a11yThemeHCDark": "Alto contraste (oscuro)",
            "a11yThemeHCLight": "Alto contraste (claro)",
            "a11yThemeYellowBlack": "Amarillo sobre negro",
            "a11yFontSize": "Tamaño de fuente",
            "a11yFontFamily": "Familia de fuente",
            "a11yFontDefault": "Predeterminado",
            "a11yFontSans": "Sans-serif",
            "a11yFontSerif": "Serif",
            "a11yFontDyslexic": "OpenDyslexic",
            "a11yLineSpacing": "Espaciado de línea",
            "a11ySpacingNormal": "Normal",
            "a11ySpacingRelaxed": "Relajado",
            "a11ySpacingVeryRelaxed": "Muy relajado",
            "a11yLetterSpacing": "Espaciado de letras",
            "a11yWordSpacing": "Espaciado de palabras",
            "a11ySpacingWide": "Amplio",
            "a11ySpacingWider": "Muy amplio",
            "a11yKeyboardShortcuts": "Atajos de teclado",
            "a11yShowShortcuts": "Mostrar atajos de teclado",
            "switchEnginePrev": "Cambiar al motor de búsqueda anterior",
            "switchEngineNext": "Cambiar al siguiente motor de búsqueda",
            "focusSearch": "Enfocar cuadro de búsqueda",
            "openSettings": "Abrir configuración",
            "closeModal": "Cerrar modal o cancelar",
            "navigate": "Navegar entre elementos",
            "activate": "Activar botón o enlace",
            "a11yMotion": "Movimiento",
            "a11yAnimations": "Animaciones",
            "a11yMotionFull": "Completo",
            "a11yMotionReduced": "Reducido",
            "a11yMotionNone": "Ninguno",
            "a11yFocus": "Foco",
            "a11yFocusIndicator": "Indicador de foco",
            "a11yFocusStandard": "Estándar",
            "a11yFocusEnhanced": "Mejorado",
            "a11yFocusLarge": "Grande",
            "a11yReset": "Restablecer ajustes",
            "aboutDescription": "Extensión de nueva pestaña del navegador completamente de código abierto, de alto rendimiento y extremadamente minimalista.",
            "aboutOpenSource": "GenresFox es un proyecto open source. ¡Encuentra el código en GitHub!",
            "viewOnGitHub": "Ver en GitHub",
            "creditsTitle": "Créditos",
            "creditsBingWallpaper": "Fondo predeterminado de Bing Daily Wallpaper.",
            "processingImage": "Procesando imagen...",
            "processingLoading": "Cargando imagen...",
            "processingOptimizing": "Optimizando...",
            "processingCompressing": "Comprimiendo...",
            "processingSaving": "Guardando...",
            "processingStarting": "Iniciando...",
            "errorImageTooLarge": "Imagen demasiado grande (máx 50MB)",
            "errorResolutionTooHigh": "Resolución demasiado alta (máx 80 megapíxeles)",
            "resetToBing": "Cambiado a fondo diario de Bing",
            "deleteShortcutConfirm": "¿Eliminar acceso directo \"%s\"?",
            "searchErrorUnsafeUrl": "Esta URL puede ser insegura.",
            "searchErrorNavigationFailed": "No se pudo abrir el enlace.",
            "searchErrorNoEngine": "No hay motor de búsqueda disponible.",
            "searchErrorNoInput": "El campo de búsqueda no está disponible.",
            "searchErrorInvalidInput": "Por favor, ingrese una consulta de búsqueda válida.",
            "searchErrorInvalidEngine": "La URL del motor de búsqueda es inválida.",
            "searchErrorQueryTooLong": "La consulta de búsqueda es demasiado larga.",
            "searchErrorBuildUrl": "Error al construir la URL de búsqueda.",
            "searchErrorUnexpected": "Ocurrió un error inesperado. Por favor, intente nuevamente.",
            "searchErrorInitFailed": "Error al inicializar la barra de búsqueda.",
            "themeSectionTitle": "Tema",
            "themeUseWallpaperAccent": "Usar colores del fondo como acento",
            "snowEffectToggle": "Efecto de nieve",
            "stickyNotes": "Notas adhesivas",
            "addStickyNote": "Añadir nota",
            "clearAllStickyNotes": "Borrar todas",
            "clearAllStickyNotesConfirm": "¿Borrar todas las notas adhesivas?",
            "deleteStickyNote": "Eliminar nota",
            "enableStickyNotes": "Habilitar notas adhesivas",
            "stickyNotePlaceholder": "Escribe aquí...",
            "folderDefault": "Carpeta",
            "folderRemove": "Eliminar",
            "folderExtract": "Extraer",
            "folderDisband": "Desagrupar carpeta",
            "dragOverMerge": "Mantén para agrupar en carpeta",
            "bringToFront": "Traer al frente",
            "stickyNoteFontSettings": "Configuración de fuente",
            "stickyNoteFontSize": "Tamaño",
            "stickyNoteLetterSpacing": "Espaciado",
            "stickyNoteLineHeight": "Interlineado",
            "exportConfigTitle": "Exportar configuración",
            "exportConfigDescription": "Exporta todas tus configuraciones, accesos directos y personalizaciones a un archivo JSON para respaldo o compartir.",
            "exportConfigButton": "Exportar configuración",
            "exportConfigSuccess": "¡Configuración exportada exitosamente!",
            "exportConfigError": "Error al exportar la configuración.",
            "importConfigButton": "Importar configuración",
            "importConfigConfirm": "Esto reemplazará todas tus configuraciones actuales. ¿Continuar?",
            "importConfigSuccess": "¡Configuración importada exitosamente!",
            "importConfigError": "Error al importar la configuración: "
        },
        "fr": {
            "languageLabel": "Langue de l’interface",
            "languageFollowBrowser": "Suivre la langue du navigateur",
            "appTitle": "GenresFox",
            "searchPlaceholder": "Rechercher...",
            "searchActionLabel": "Rechercher",
            "settingsTitle": "Paramètres",
            "tabWallpaper": "Fond d'écran",
            "tabSearch": "Recherche & raccourcis",
            "tabAccessibility": "Accessibilité",
            "tabAbout": "À propos",
            "uploadWallpaper": "Téléverser un fond",
            "resetWallpaper": "Restaurer par défaut",
            "customEngines": "Moteurs de recherche personnalisés",
            "shortcuts": "Raccourcis",
            "add": "Ajouter",
            "dragDropText": "Glissez une image ici ou cliquez pour téléverser",
            "wallpaperSettings": "Paramètres du fond",
            "blurAmount": "Flou",
            "vignetteAmount": "Vignette",
            "resetShortcuts": "Réinitialiser les raccourcis",
            "shortcutOpenCurrent": "Ouvrir dans l’onglet actuel",
            "shortcutOpenNewTab": "Ouvrir dans un nouvel onglet",
            "searchBoxSettings": "Paramètres de la recherche",
            "searchBoxWidth": "Largeur",
            "searchBoxScale": "Taille",
            "searchBoxPosition": "Position verticale",
            "searchBoxRadius": "Rayon des angles",
            "searchBoxShadow": "Intensité de l'ombre",
            "showShortcutNames": "Afficher les noms des raccourcis",
            "shortcutDragHint": "💡 Faites glisser pour réorganiser",
            "livePreview": "Aperçu en direct",
            "a11yDisplay": "Affichage",
            "a11yTheme": "Thème",
            "a11yThemeStandard": "Standard",
            "a11yThemeHCDark": "Contraste élevé (sombre)",
            "a11yThemeHCLight": "Contraste élevé (clair)",
            "a11yThemeYellowBlack": "Jaune sur noir",
            "a11yFontSize": "Taille de police",
            "a11yFontFamily": "Famille de police",
            "a11yFontDefault": "Par défaut",
            "a11yFontSans": "Sans-serif",
            "a11yFontSerif": "Serif",
            "a11yFontDyslexic": "OpenDyslexic",
            "a11yLineSpacing": "Interligne",
            "a11ySpacingNormal": "Normal",
            "a11ySpacingRelaxed": "Détendu",
            "a11ySpacingVeryRelaxed": "Très détendu",
            "a11yLetterSpacing": "Espacement des lettres",
            "a11yWordSpacing": "Espacement des mots",
            "a11ySpacingWide": "Large",
            "a11ySpacingWider": "Très large",
            "a11yKeyboardShortcuts": "Raccourcis clavier",
            "a11yShowShortcuts": "Afficher les raccourcis clavier",
            "switchEnginePrev": "Passer au moteur de recherche précédent",
            "switchEngineNext": "Passer au moteur de recherche suivant",
            "focusSearch": "Mettre le focus sur la zone de recherche",
            "openSettings": "Ouvrir les paramètres",
            "closeModal": "Fermer la fenêtre ou annuler",
            "navigate": "Naviguer entre les éléments",
            "activate": "Activer le bouton ou le lien",
            "a11yMotion": "Mouvements",
            "a11yAnimations": "Animations",
            "a11yMotionFull": "Complet",
            "a11yMotionReduced": "Réduit",
            "a11yMotionNone": "Aucun",
            "a11yFocus": "Focus",
            "a11yFocusIndicator": "Indicateur de focus",
            "a11yFocusStandard": "Standard",
            "a11yFocusEnhanced": "Amélioré",
            "a11yFocusLarge": "Grand",
            "a11yReset": "Restaurer les paramètres",
            "aboutDescription": "Extension de nouvel onglet de navigateur entièrement open source, haute performance et extrêmement minimaliste.",
            "aboutOpenSource": "GenresFox est open source. Retrouvez le code sur GitHub !",
            "viewOnGitHub": "Voir sur GitHub",
            "creditsTitle": "Crédits",
            "creditsBingWallpaper": "Fond par défaut : Bing Daily Wallpaper.",
            "processingImage": "Traitement de l'image...",
            "processingLoading": "Chargement de l'image...",
            "processingOptimizing": "Optimisation...",
            "processingCompressing": "Compression...",
            "processingSaving": "Enregistrement...",
            "processingStarting": "Démarrage...",
            "errorImageTooLarge": "Fichier trop volumineux (max 50MB)",
            "errorResolutionTooHigh": "Résolution trop élevée (max 80 mégapixels)",
            "resetToBing": "Passé au fond quotidien Bing",
            "deleteShortcutConfirm": "Supprimer le raccourci \"%s\" ?",
            "searchErrorUnsafeUrl": "Cette URL peut être dangereuse.",
            "searchErrorNavigationFailed": "Impossible d'ouvrir le lien.",
            "searchErrorNoEngine": "Aucun moteur de recherche disponible.",
            "searchErrorNoInput": "Le champ de recherche n'est pas disponible.",
            "searchErrorInvalidInput": "Veuillez entrer une requête de recherche valide.",
            "searchErrorInvalidEngine": "L'URL du moteur de recherche est invalide.",
            "searchErrorQueryTooLong": "La requête de recherche est trop longue.",
            "searchErrorBuildUrl": "Échec de la construction de l'URL de recherche.",
            "searchErrorUnexpected": "Une erreur inattendue s'est produite. Veuillez réessayer.",
            "searchErrorInitFailed": "Échec de l'initialisation de la barre de recherche.",
            "themeSectionTitle": "Thème",
            "themeUseWallpaperAccent": "Utiliser les couleurs du fond comme accent",
            "snowEffectToggle": "Effet de neige",
            "stickyNotes": "Post-its",
            "addStickyNote": "Ajouter une note",
            "clearAllStickyNotes": "Tout effacer",
            "clearAllStickyNotesConfirm": "Effacer toutes les notes ?",
            "deleteStickyNote": "Supprimer la note",
            "enableStickyNotes": "Activer les post-its",
            "stickyNotePlaceholder": "Tapez ici...",
            "folderDefault": "Dossier",
            "folderRemove": "Retirer",
            "folderExtract": "Extraire",
            "folderDisband": "Dissoudre le dossier",
            "dragOverMerge": "Maintenir pour fusionner dans le dossier",
            "bringToFront": "Mettre au premier plan",
            "stickyNoteFontSettings": "Paramètres de police",
            "stickyNoteFontSize": "Taille",
            "stickyNoteLetterSpacing": "Espacement",
            "stickyNoteLineHeight": "Interligne",
            "exportConfigTitle": "Exporter la configuration",
            "exportConfigDescription": "Exportez tous vos paramètres, raccourcis et personnalisations dans un fichier JSON pour sauvegarde ou partage.",
            "exportConfigButton": "Exporter la configuration",
            "exportConfigSuccess": "Configuration exportée avec succès !",
            "exportConfigError": "Échec de l'exportation de la configuration.",
            "importConfigButton": "Importer la configuration",
            "importConfigConfirm": "Cela remplacera tous vos paramètres actuels. Continuer ?",
            "importConfigSuccess": "Configuration importée avec succès !",
            "importConfigError": "Échec de l'importation de la configuration : "
        },
        "de": {
            "languageLabel": "Oberflächensprache",
            "languageFollowBrowser": "Browsersprache verwenden",
            "appTitle": "GenresFox",
            "searchPlaceholder": "Suchen...",
            "searchActionLabel": "Suchen",
            "settingsTitle": "Einstellungen",
            "tabWallpaper": "Hintergrundbild",
            "tabSearch": "Suche und Schnellzugriffe",
            "tabAccessibility": "Barrierefreiheit",
            "tabAbout": "Über",
            "uploadWallpaper": "Hintergrundbild hochladen",
            "resetWallpaper": "Standard wiederherstellen",
            "customEngines": "Benutzerdefinierte Suchmaschinen",
            "shortcuts": "Schnellzugriffe",
            "add": "Hinzufügen",
            "dragDropText": "Ziehen Sie das Bild hierher oder klicken Sie zum Hochladen",
            "wallpaperSettings": "Hintergrundbild-Einstellungen",
            "blurAmount": "Unschärfegrad",
            "vignetteAmount": "Vignettierungsgrad",
            "resetShortcuts": "Schnellzugriffe zurücksetzen",
            "shortcutOpenCurrent": "In aktueller Seite öffnen",
            "shortcutOpenNewTab": "In neuem Tab öffnen",
            "searchBoxSettings": "Suchfeld-Einstellungen",
            "searchBoxWidth": "Breite",
            "searchBoxScale": "Größe",
            "searchBoxPosition": "Vertikale Position",
            "searchBoxRadius": "Eckenradius",
            "searchBoxShadow": "Schattenintensität",
            "showShortcutNames": "Namen der Schnellzugriffe anzeigen",
            "shortcutDragHint": "💡 Ziehen Sie die Schnellzugriffe, um die Reihenfolge anzupassen",
            "livePreview": "Live-Vorschau",
            "a11yDisplay": "Anzeige",
            "a11yTheme": "Thema",
            "a11yThemeStandard": "Standard",
            "a11yThemeHCDark": "Hoher Kontrast (Dunkel)",
            "a11yThemeHCLight": "Hoher Kontrast (Hell)",
            "a11yThemeYellowBlack": "Gelb auf Schwarz",
            "a11yFontSize": "Schriftgröße",
            "a11yFontFamily": "Schriftart",
            "a11yFontDefault": "Standard",
            "a11yFontSans": "Serifenlos",
            "a11yFontSerif": "Serifenhaltig",
            "a11yFontDyslexic": "Dyslexiefreundlich",
            "a11yLineSpacing": "Zeilenabstand",
            "a11ySpacingNormal": "Normal",
            "a11ySpacingRelaxed": "Lockerer",
            "a11ySpacingVeryRelaxed": "Sehr locker",
            "a11yLetterSpacing": "Zeichenabstand",
            "a11yWordSpacing": "Wortabstand",
            "a11ySpacingWide": "Weit",
            "a11ySpacingWider": "Sehr weit",
            "a11yKeyboardShortcuts": "Tastenkürzel",
            "a11yShowShortcuts": "Tastenkürzel anzeigen",
            "switchEnginePrev": "Zum vorherigen Suchmaschine wechseln",
            "switchEngineNext": "Zur nächsten Suchmaschine wechseln",
            "focusSearch": "Suchfeld fokussieren",
            "openSettings": "Einstellungen öffnen",
            "closeModal": "Modal schließen oder abbrechen",
            "navigate": "Zwischen Elementen navigieren",
            "activate": "Schaltfläche oder Link aktivieren",
            "a11yMotion": "Animationen",
            "a11yAnimations": "Animationseffekte",
            "a11yMotionFull": "Vollständig",
            "a11yMotionReduced": "Reduziert",
            "a11yMotionNone": "Keine",
            "a11yFocus": "Fokus",
            "a11yFocusIndicator": "Fokusindikator",
            "a11yFocusStandard": "Standard",
            "a11yFocusEnhanced": "Erweitert",
            "a11yFocusLarge": "Groß",
            "a11yReset": "Einstellungen auf Standard zurücksetzen",
            "aboutDescription": "Eine vollständig quelloffene, leistungsstarke und äußerst minimalistische Browser-Erweiterung für neue Registerkarten.",
            "aboutOpenSource": "GenresFox ist ein quelloffenes Projekt – Sie finden den Quellcode auf GitHub!",
            "viewOnGitHub": "Auf GitHub anzeigen",
            "creditsTitle": "Danksagungen",
            "creditsBingWallpaper": "Standard-Hintergrundbilder werden von Bing Tagesbilder bereitgestellt.",
            "processingImage": "Bild wird verarbeitet...",
            "processingLoading": "Bild wird geladen...",
            "processingOptimizing": "Optimiert wird...",
            "processingCompressing": "Komprimiert wird...",
            "processingSaving": "Wird gespeichert...",
            "processingStarting": "Verarbeitung startet...",
            "errorImageTooLarge": "Bilddatei ist zu groß (max. 50 MB)",
            "errorResolutionTooHigh": "Bildauflösung ist zu hoch (max. 80 Megapixel)",
            "resetToBing": "Wechsel zu Bing Tagesbild abgeschlossen",
            "deleteShortcutConfirm": "Sind Sie sicher, dass Sie den Schnellzugriff „%s“ löschen möchten?",
            "searchErrorUnsafeUrl": "Zugriff auf diese URL nicht möglich – möglicherweise unsicher.",
            "searchErrorNavigationFailed": "Link konnte nicht geöffnet werden.",
            "searchErrorNoEngine": "Keine Suchmaschinen verfügbar.",
            "searchErrorNoInput": "Suchfeld nicht verfügbar.",
            "searchErrorInvalidInput": "Bitte geben Sie eine gültige Suchanfrage ein.",
            "searchErrorInvalidEngine": "Die URL der Suchmaschine ist ungültig.",
            "searchErrorQueryTooLong": "Die Suchanfrage ist zu lang.",
            "searchErrorBuildUrl": "Fehler beim Erstellen der Such-URL.",
            "searchErrorUnexpected": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
            "searchErrorInitFailed": "Fehler beim Initialisieren der Suchleiste.",
            "themeSectionTitle": "Thema",
            "themeUseWallpaperAccent": "Hintergrundfarben als Akzent verwenden",
            "snowEffectToggle": "Schneeeffekt",
            "stickyNotes": "Haftnotizen",
            "addStickyNote": "Notiz hinzufügen",
            "clearAllStickyNotes": "Alle löschen",
            "clearAllStickyNotesConfirm": "Alle Haftnotizen löschen?",
            "deleteStickyNote": "Notiz löschen",
            "enableStickyNotes": "Haftnotizen aktivieren",
            "stickyNotePlaceholder": "Hier eingeben...",
            "folderDefault": "Ordner",
            "folderRemove": "Entfernen",
            "folderExtract": "Herausziehen",
            "folderDisband": "Ordner auflösen",
            "dragOverMerge": "Halten, um in Ordner zu gruppieren",
            "bringToFront": "In den Vordergrund bringen",
            "stickyNoteFontSettings": "Schriftarteinstellungen",
            "stickyNoteFontSize": "Größe",
            "stickyNoteLetterSpacing": "Zeichenabstand",
            "stickyNoteLineHeight": "Zeilenabstand",
            "exportConfigTitle": "Konfiguration exportieren",
            "exportConfigDescription": "Exportieren Sie alle Ihre Einstellungen, Verknüpfungen und Anpassungen in eine JSON-Datei für Backup oder zum Teilen.",
            "exportConfigButton": "Konfiguration exportieren",
            "exportConfigSuccess": "Konfiguration erfolgreich exportiert!",
            "exportConfigError": "Export der Konfiguration fehlgeschlagen.",
            "importConfigButton": "Konfiguration importieren",
            "importConfigConfirm": "Dies ersetzt alle Ihre aktuellen Einstellungen. Fortfahren?",
            "importConfigSuccess": "Konfiguration erfolgreich importiert!",
            "importConfigError": "Import der Konfiguration fehlgeschlagen: "
        },
        "ru": {
            "languageLabel": "Язык интерфейса",
            "languageFollowBrowser": "Следовать языку браузера",
            "appTitle": "GenresFox",
            "searchPlaceholder": "Поиск...",
            "searchActionLabel": "Поиск",
            "settingsTitle": "Настройки",
            "tabWallpaper": "Обои",
            "tabSearch": "Поиск и ярлыки",
            "tabAccessibility": "Доступность",
            "tabAbout": "О приложении",
            "uploadWallpaper": "Загрузить обои",
            "resetWallpaper": "Восстановить по умолчанию",
            "customEngines": "Пользовательские поисковые системы",
            "shortcuts": "Ярлыки",
            "add": "Добавить",
            "dragDropText": "Перетащите изображение сюда или нажмите для загрузки",
            "wallpaperSettings": "Настройки обоев",
            "blurAmount": "Степень размытия",
            "vignetteAmount": "Степень виньетирования",
            "resetShortcuts": "Сбросить ярлыки",
            "shortcutOpenCurrent": "Открыть в текущей вкладке",
            "shortcutOpenNewTab": "Открыть в новой вкладке",
            "searchBoxSettings": "Настройки поискового поля",
            "searchBoxWidth": "Ширина",
            "searchBoxScale": "Размер",
            "searchBoxPosition": "Вертикальное положение",
            "searchBoxRadius": "Радиус скругления",
            "searchBoxShadow": "Интенсивность тени",
            "showShortcutNames": "Показывать названия ярлыков",
            "shortcutDragHint": "💡 Перетащите ярлыки, чтобы изменить их порядок",
            "livePreview": "Превью в реальном времени",
            "a11yDisplay": "Отображение",
            "a11yTheme": "Тема",
            "a11yThemeStandard": "Стандартная",
            "a11yThemeHCDark": "Высокая контрастность (темная)",
            "a11yThemeHCLight": "Высокая контрастность (светлая)",
            "a11yThemeYellowBlack": "Желтый на черном фоне",
            "a11yFontSize": "Размер шрифта",
            "a11yFontFamily": "Шрифт",
            "a11yFontDefault": "По умолчанию",
            "a11yFontSans": "Без засечек",
            "a11yFontSerif": "С засечками",
            "a11yFontDyslexic": "Удобный для дислексиков",
            "a11yLineSpacing": "Межстрочный интервал",
            "a11ySpacingNormal": "Нормальный",
            "a11ySpacingRelaxed": "Увеличенный",
            "a11ySpacingVeryRelaxed": "Очень большой",
            "a11yLetterSpacing": "Межбуквенный интервал",
            "a11yWordSpacing": "Межсловный интервал",
            "a11ySpacingWide": "Широкий",
            "a11ySpacingWider": "Очень широкий",
            "a11yKeyboardShortcuts": "Горячие клавиши",
            "a11yShowShortcuts": "Показать горячие клавиши",
            "switchEnginePrev": "Переключиться на предыдущую поисковую систему",
            "switchEngineNext": "Переключиться на следующую поисковую систему",
            "focusSearch": "Фокус на поле поиска",
            "openSettings": "Открыть настройки",
            "closeModal": "Закрыть модальное окно или отменить",
            "navigate": "Навигация между элементами",
            "activate": "Активировать кнопку или ссылку",
            "a11yMotion": "Анимации",
            "a11yAnimations": "Эффекты анимации",
            "a11yMotionFull": "Полные",
            "a11yMotionReduced": "Уменьшенные",
            "a11yMotionNone": "Отсутствуют",
            "a11yFocus": "Фокус",
            "a11yFocusIndicator": "Индикатор фокуса",
            "a11yFocusStandard": "Стандартный",
            "a11yFocusEnhanced": "Улучшенный",
            "a11yFocusLarge": "Крупный",
            "a11yReset": "Восстановить настройки по умолчанию",
            "aboutDescription": "Полностью открытое, высокопроизводительное и чрезвычайно минималистичное расширение для новых вкладок браузера.",
            "aboutOpenSource": "GenresFox — это открытый проект! Исходный код доступен на GitHub.",
            "viewOnGitHub": "Просмотреть на GitHub",
            "creditsTitle": "Благодарности",
            "creditsBingWallpaper": "Стандартные обои предоставляются службой Bing Обои дня.",
            "processingImage": "Обработка изображения...",
            "processingLoading": "Загрузка изображения...",
            "processingOptimizing": "Оптимизация...",
            "processingCompressing": "Сжатие...",
            "processingSaving": "Сохранение...",
            "processingStarting": "Начало обработки...",
            "errorImageTooLarge": "Размер файла изображения слишком большой (максимум 50 МБ)",
            "errorResolutionTooHigh": "Разрешение изображения слишком высокое (максимум 80 мегапикселей)",
            "resetToBing": "Переключено на Bing Обои дня",
            "deleteShortcutConfirm": "Удалить ярлык «%s»?",
            "searchErrorUnsafeUrl": "Невозможно получить доступ к этому адресу — он может быть небезопасным.",
            "searchErrorNavigationFailed": "Не удалось открыть ссылку.",
            "searchErrorNoEngine": "Нет доступных поисковых систем.",
            "searchErrorNoInput": "Поле поиска недоступно.",
            "searchErrorInvalidInput": "Пожалуйста, введите действительный поисковый запрос.",
            "searchErrorInvalidEngine": "URL поисковой системы недействителен.",
            "searchErrorQueryTooLong": "Поисковый запрос слишком длинный.",
            "searchErrorBuildUrl": "Не удалось создать URL для поиска.",
            "searchErrorUnexpected": "Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова.",
            "searchErrorInitFailed": "Не удалось инициализировать панель поиска.",
            "themeSectionTitle": "Тема",
            "themeUseWallpaperAccent": "Использовать основные цвета обоев как акцент",
            "snowEffectToggle": "Эффект снега",
            "stickyNotes": "Заметки",
            "addStickyNote": "Добавить заметку",
            "clearAllStickyNotes": "Очистить все",
            "clearAllStickyNotesConfirm": "Очистить все заметки?",
            "deleteStickyNote": "Удалить заметку",
            "enableStickyNotes": "Включить заметки",
            "stickyNotePlaceholder": "Введите текст...",
            "folderDefault": "Папка",
            "folderRemove": "Удалить",
            "folderExtract": "Извлечь",
            "folderDisband": "Распустить папку",
            "dragOverMerge": "Удерживайте для объединения в папку",
            "bringToFront": "На передний план",
            "stickyNoteFontSettings": "Настройки шрифта",
            "stickyNoteFontSize": "Размер",
            "stickyNoteLetterSpacing": "Межбуквенный интервал",
            "stickyNoteLineHeight": "Межстрочный интервал",
            "exportConfigTitle": "Экспорт конфигурации",
            "exportConfigDescription": "Экспортируйте все ваши настройки, ярлыки и кастомизации в JSON-файл для резервного копирования или обмена.",
            "exportConfigButton": "Экспортировать конфигурацию",
            "exportConfigSuccess": "Конфигурация успешно экспортирована!",
            "exportConfigError": "Не удалось экспортировать конфигурацию.",
            "importConfigButton": "Импортировать конфигурацию",
            "importConfigConfirm": "Это заменит все ваши текущие настройки. Продолжить?",
            "importConfigSuccess": "Конфигурация успешно импортирована!",
            "importConfigError": "Не удалось импортировать конфигурацию: "
        }
    };

    // Supported languages list
    const _supportedLanguages = ['zh_CN', 'zh_TW', 'ja', 'en', 'es', 'fr', 'de', 'ru'];

    // Current language
    let _currentLanguage = null;

    /**
     * Detect user's preferred language based on browser settings
     * @returns {string} Language code
     */
    function _detectLanguage() {
        const saved = localStorage.getItem('preferredLanguage');
        if (saved && _supportedLanguages.includes(saved)) {
            return saved;
        }

        const browserLang = navigator.language || navigator.userLanguage;

        // Check for Traditional Chinese (Taiwan, Hong Kong, Macau, etc.)
        if (browserLang === 'zh-TW' || browserLang === 'zh-HK' || browserLang === 'zh-MO' || browserLang === 'zh-Hant') {
            return 'zh_TW';
        }
        // Check for Simplified Chinese (Mainland China, Singapore, etc.)
        if (browserLang.startsWith('zh')) {
            return 'zh_CN';
        }
        // Check for Japanese
        if (browserLang.startsWith('ja')) {
            return 'ja';
        }
        // German
        if (browserLang.startsWith('de')) {
            return 'de';
        }
        // Russian
        if (browserLang.startsWith('ru')) {
            return 'ru';
        }
        // Default to English
        return 'en';
    }

    /**
     * Get a translated message by key
     * @param {string} key - Message key
     * @returns {string} Translated message or empty string
     */
    function getMessage(key) {
        // Ensure _currentLanguage is initialized
        if (!_currentLanguage) {
            _currentLanguage = _detectLanguage();
        }

        // Try Chrome i18n API first
        if (typeof chrome !== 'undefined' && chrome.i18n) {
            const msg = chrome.i18n.getMessage(key);
            // If Chrome API returns a non-empty string, use it
            if (msg && msg.trim().length > 0) {
                return msg;
            }
            // If Chrome API returns empty string, fall through to fallback
        }

        // Fallback to local messages
        const messages = _fallbackMessages[_currentLanguage] || _fallbackMessages['en'];
        return messages[key] || key;
    }

    /**
     * Apply translations to all elements with data-i18n attributes
     * @param {string} [lang] - Optional language code to switch to
     */
    function localize(lang = null) {
        try {
            // Initialize _currentLanguage if not set
            if (!_currentLanguage) {
                _currentLanguage = _detectLanguage();
            }

            if (lang && _supportedLanguages.includes(lang)) {
                _currentLanguage = lang;
                localStorage.setItem('preferredLanguage', lang);
            }

            // Ensure _currentLanguage is valid
            if (!_currentLanguage || !_fallbackMessages[_currentLanguage]) {
                console.warn(`[I18n] Invalid language "${_currentLanguage}", falling back to English`);
                _currentLanguage = 'en';
            }
            
            // Double-check fallback exists
            if (!_fallbackMessages[_currentLanguage]) {
                console.error('[I18n] Critical: English fallback missing, this should never happen');
                _currentLanguage = 'en';
            }
        } catch (e) {
            console.error('[I18n] Error in localize initialization:', e);
            _currentLanguage = 'en';
        }

        const fallback = _fallbackMessages[_currentLanguage] || _fallbackMessages['en'];
        const hasManualPreference = localStorage.getItem('preferredLanguage');
        
        // Test Chrome i18n API reliability by checking a known key
        let chromeI18nReliable = false;
        if (typeof chrome !== 'undefined' && chrome.i18n && !hasManualPreference) {
            const testMsg = chrome.i18n.getMessage('searchPlaceholder');
            // Chrome i18n is reliable only if it returns a non-empty string
            chromeI18nReliable = testMsg && testMsg.trim().length > 0;
        }

        if (chromeI18nReliable) {
            // Use Chrome's i18n only if it's reliable, and only when it returns
            // a real translation (not just echoing the key name).
            document.querySelectorAll('[data-i18n]').forEach(elem => {
                const key = elem.dataset.i18n;

                // Accessibility keys have known-good fallbacks and some builds
                // ship with uppercase placeholders in Chrome messages, so always
                // prefer our own translations for them.
                if (key && key.startsWith('a11y')) {
                    const fallbackMsg = fallback && fallback[key] ? fallback[key] : key;
                    elem.textContent = fallbackMsg;
                    return;
                }

                let msg = chrome.i18n.getMessage(key);
                // If Chrome API returns empty string / null / or just the key itself, use fallback
                if (!msg ||
                    msg.trim().length === 0 ||
                    msg === key ||
                    msg.toUpperCase() === key.toUpperCase()) {
                    msg = fallback && fallback[key] ? fallback[key] : key;
                }
                elem.textContent = msg;
            });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
                const key = elem.dataset.i18nPlaceholder;

                if (key && key.startsWith('a11y')) {
                    const fallbackMsg = fallback && fallback[key] ? fallback[key] : key;
                    elem.placeholder = fallbackMsg;
                    return;
                }

                let msg = chrome.i18n.getMessage(key);
                // If Chrome API returns empty string / null / or just the key itself, use fallback
                if (!msg ||
                    msg.trim().length === 0 ||
                    msg === key ||
                    msg.toUpperCase() === key.toUpperCase()) {
                    msg = fallback && fallback[key] ? fallback[key] : key;
                }
                elem.placeholder = msg;
            });
            document.querySelectorAll('[data-i18n-aria-label]').forEach(elem => {
                const key = elem.dataset.i18nAriaLabel;

                if (key && key.startsWith('a11y')) {
                    const fallbackMsg = fallback && fallback[key] ? fallback[key] : key;
                    elem.setAttribute('aria-label', fallbackMsg);
                    return;
                }

                let msg = chrome.i18n.getMessage(key);
                if (!msg ||
                    msg.trim().length === 0 ||
                    msg === key ||
                    msg.toUpperCase() === key.toUpperCase()) {
                    msg = fallback && fallback[key] ? fallback[key] : key;
                }
                elem.setAttribute('aria-label', msg);
            });
        } else {
            // Use fallback messages with selected language (more reliable)
            const messages = _fallbackMessages[_currentLanguage] || _fallbackMessages['en'];
            
            try {
                document.querySelectorAll('[data-i18n]').forEach(elem => {
                    try {
                        const key = elem.dataset.i18n;
                        if (key && messages[key]) {
                            elem.textContent = messages[key];
                        } else if (key) {
                            elem.textContent = key; // Fallback to key name
                        }
                    } catch (e) {
                        console.warn('[I18n] Error localizing element:', e);
                    }
                });
            } catch (e) {
                console.error('[I18n] Error in data-i18n localization:', e);
            }
            
            try {
                document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
                    try {
                        const key = elem.dataset.i18nPlaceholder;
                        if (key && messages[key]) {
                            elem.placeholder = messages[key];
                        } else if (key) {
                            elem.placeholder = key; // Fallback to key name
                        }
                    } catch (e) {
                        console.warn('[I18n] Error localizing placeholder:', e);
                    }
                });
            } catch (e) {
                console.error('[I18n] Error in data-i18n-placeholder localization:', e);
            }

            try {
                document.querySelectorAll('[data-i18n-aria-label]').forEach(elem => {
                    try {
                        const key = elem.dataset.i18nAriaLabel;
                        if (key && messages[key]) {
                            elem.setAttribute('aria-label', messages[key]);
                        } else if (key) {
                            elem.setAttribute('aria-label', key);
                        }
                    } catch (e) {
                        console.warn('[I18n] Error localizing aria-label:', e);
                    }
                });
            } catch (e) {
                console.error('[I18n] Error in data-i18n-aria-label localization:', e);
            }
        }

        // Update HTML lang attribute
        const langMap = {
            'zh_CN': 'zh-Hans',
            'zh_TW': 'zh-Hant',
            'ja': 'ja',
            'de': 'de',
            'ru': 'ru',
            'en': 'en'
        };
        document.documentElement.lang = langMap[_currentLanguage] || 'en';
    }

    /**
     * Get current language code
     * @returns {string} Current language code
     */
    function getCurrentLanguage() {
        return _currentLanguage;
    }

    /**
     * Get list of supported languages
     * @returns {string[]} Array of supported language codes
     */
    function getSupportedLanguages() {
        return [..._supportedLanguages];
    }

    /**
     * Health check: Verify i18n system is working correctly
     * @returns {boolean} True if system is healthy
     */
    function healthCheck() {
        try {
            // Check if _currentLanguage is set
            if (!_currentLanguage) {
                _currentLanguage = _detectLanguage();
            }
            
            // Check if fallback messages exist for current language
            if (!_fallbackMessages[_currentLanguage]) {
                console.warn(`[I18n] Fallback messages missing for language: ${_currentLanguage}, falling back to English`);
                _currentLanguage = 'en';
            }
            
            // Test Chrome i18n API if available
            if (typeof chrome !== 'undefined' && chrome.i18n) {
                const testKey = 'searchPlaceholder';
                const testMsg = chrome.i18n.getMessage(testKey);
                if (!testMsg || testMsg.trim().length === 0) {
                    console.warn('[I18n] Chrome i18n API returned empty string, using fallback messages');
                }
            }
            
            // Test fallback message retrieval
            const testFallback = _fallbackMessages[_currentLanguage] || _fallbackMessages['en'];
            if (!testFallback || !testFallback['searchPlaceholder']) {
                console.error('[I18n] Critical: Fallback messages are corrupted');
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('[I18n] Health check failed:', e);
            return false;
        }
    }

    /**
     * Initialize the i18n module
     */
    function init() {
        try {
            _currentLanguage = _detectLanguage();
            
            // Run health check after initialization
            if (!healthCheck()) {
                console.error('[I18n] Initialization health check failed, forcing English fallback');
                _currentLanguage = 'en';
            }
        } catch (e) {
            console.error('[I18n] Initialization failed:', e);
            _currentLanguage = 'en';
        }
    }

    // Public API
    return {
        init,
        localize,
        getMessage,
        getCurrentLanguage,
        getSupportedLanguages,
        healthCheck
    };
})();

