/**
 * Console Security Warning
 * Displays a prominent warning when browser console is opened
 * to prevent users from falling victim to malicious code
 */

(function() {
    'use strict';

    // Display warning immediately
    console.log(
        '%c【等等！请务必停下来，仔细阅读！】',
        'color: #ff0000; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);'
    );
    
    console.log(
        '%c在使用控制台之前请务必三思而后行。',
        'color: #ff0000; font-size: 18px; font-weight: bold;'
    );
    
    console.log(
        '%c您在此输入的任何内容都有可能影响到您的浏览器。\n' +
        '您在此输入的任何内容都有可能会被别有用心者利用。\n' +
        '请不要输入GenresFox在官方GitHub仓库提供的以外的命令。\n' +
        '不要相信任何【主动要求你】在控制台复制并粘贴内容的人或消息，\n这百分之一百亿是诈骗！\n\n' +
        '唯一例外：你自己主动访问 GenresFox 官方 GitHub 仓库获取的命令。\n\n' +
        '请关闭此窗口以保证您的浏览器安全……\n' +
        '除非您确实知道您在做什么。\n\n' +
        '*如果您对本项目有兴趣，不妨来贡献一些好好玩很有趣的东西？\n' +
        'GitHub官方仓库：https://github.com/zayokami/GenresFox',
        'color: #ff0000; font-size: 14px; line-height: 1.6;'
    );

    // Also display in English for international users
    console.log(
        '%c【Wait! Please stop and read this carefully!】',
        'color: #ff0000; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);'
    );
    
    console.log(
        '%cThink twice before using the console.',
        'color: #ff0000; font-size: 18px; font-weight: bold;'
    );
    
    console.log(
        '%cAnything you enter here may affect your browser.\n' +
        'Anything you enter here may be exploited by malicious actors.\n' +
        'Do not enter any commands other than those provided in the official GenresFox GitHub repository.\n' +
        'Do not trust anyone【ASKING YOU】to "copy and paste anything in the console" - this is 10 billion percent a scam!\n\n' +
        'Exception: Commands you actively obtained from the official GenresFox GitHub repository.\n\n' +
        'Please close this window to keep your browser safe...\n' +
        'Unless you really know what you are doing.\n\n' +
        '*If you are interested in this project, why not contribute something fun and interesting?\n' +
        'Official GitHub repository: https://github.com/zayokami/GenresFox',
        'color: #ff0000; font-size: 14px; line-height: 1.6;'
    );
})();

