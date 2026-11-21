const { cp, mkdir, rm } = require('node:fs/promises');
const { join } = require('node:path');

async function build() {
  const destination = join(__dirname, 'media', 'vendor');
  await rm(destination, { recursive: true, force: true });
  await mkdir(join(destination, 'jquery'), { recursive: true });
  await cp(join(__dirname, 'node_modules/jquery/dist/jquery.min.js'), join(destination, 'jquery/jquery.min.js'));
  await mkdir(join(destination, 'jquery-ui'), { recursive: true });
  for (const file of ['jquery-ui.min.js', 'jquery-ui.min.css', 'images']) {
    await cp(join(__dirname, 'node_modules/jquery-ui-dist', file), join(destination, 'jquery-ui', file), { recursive: true });
  }
  for (const file of ['js/elfinder.min.js', 'css/elfinder.min.css', 'css/theme.css', 'img']) {
    const target = join(destination, 'elfinder', file);
    await mkdir(join(target, '..'), { recursive: true });
    await cp(join(__dirname, 'node_modules/elfinder', file), target, { recursive: true });
  }
  console.log('Built local elFinder, jQuery and jQuery UI assets.');
}

build().catch(error => { console.error(error); process.exitCode = 1; });
