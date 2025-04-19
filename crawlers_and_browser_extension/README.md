### Installation

#### Chromium based browsers

1. Download the source code of this repository.
2. Install [pnpm](https://pnpm.io).
3. Run `pnpm install && pnpm run build` inside the project root directory.
4. In your browser go to [chrome://extensions/](chrome://extensions/) or [opera://extensions/](opera://extensions/) or use the `Cmd/Ctrl Shift E` shortcut.
5. Enable the "Developer Mode".
6. Click the "Load Unpacked" button.
7. Select the directory of the downloaded extension.

#### Firefox and similar

1. Download the source code of this repository.
2. Install [pnpm](https://pnpm.io).
3. Run `pnpm install && pnpm run build` inside the project root directory.
4. In your browser go to [about:config](about:config).
5. Search for `xpinstall.signatures.required` and set it to `false`.
6. Go to [about:addons](about:addons).
7. Click the gearwheel and then on "Install Add-on From File".
8. Select the `fake-shop-stop.zip` file in the project root directory.
9. In the plugin settings, make sure the setting "Access your data for all websites" is enabled.
