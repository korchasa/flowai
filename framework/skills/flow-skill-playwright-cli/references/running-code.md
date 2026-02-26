# Running Custom Playwright Code

Use `run-code` to execute arbitrary Playwright code for advanced scenarios.

## Syntax
```bash
playwright-cli run-code "async page => {
  // Your Playwright code here
}"
```

## Common Scenarios

### Geolocation & Permissions
```bash
playwright-cli run-code "async page => {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
}"
```

### Wait Strategies
```bash
playwright-cli run-code "async page => {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.loading', { state: 'hidden' });
}"
```

### Frames & Iframes
```bash
playwright-cli run-code "async page => {
  const frame = page.locator('iframe#my-iframe').contentFrame();
  await frame.locator('button').click();
}"
```

### File Downloads
```bash
playwright-cli run-code "async page => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('a.download-link')
  ]);
  await download.saveAs('./downloaded-file.pdf');
}"
```
