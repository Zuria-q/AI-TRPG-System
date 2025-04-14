const ghpages = require('gh-pages');
const path = require('path');

// 配置部署选项
const options = {
  branch: 'gh-pages',
  repo: 'https://github.com/你的用户名/你的仓库名.git',
  message: '自动部署: ' + new Date().toISOString(),
  dotfiles: true
};

// 执行部署
ghpages.publish(path.join(__dirname, 'dist'), options, (err) => {
  if (err) {
    console.error('部署失败:', err);
  } else {
    console.log('已部署到GitHub Pages');
    console.log('访问地址: https://你的用户名.github.io/你的仓库名/');
  }
});
