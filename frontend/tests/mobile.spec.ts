import { test, expect, Page } from '@playwright/test';
async function fits(page:Page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(()=>window.innerWidth));
  const header=page.locator('header');
  for(const label of ['Open navigation menu','Notifications','Account settings']) {
    const box=await header.getByRole('button',{name:label,exact:true}).boundingBox();
    expect(box).not.toBeNull();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(await page.evaluate(()=>window.innerWidth));
  }
}
async function navigate(page:Page,name:string) {
  await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Navigation menu'});
  await expect(drawer).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.body.style.position)).toBe('fixed');
  await drawer.getByRole('button',{name,exact:true}).click();
  await expect(drawer).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>document.body.style.position)).toBe('');
}
test('mobile screens, touch controls, forms and drawer remain usable',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.locator('.mobile-login-logo')).toBeVisible();
 const email=page.getByLabel('Email Address',{exact:true});
 expect(await email.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
 await email.fill('browser@medivault.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic browser test password!');
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await expect(page.getByRole('heading',{name:/Good .*Browser Test Doctor/})).toBeVisible();await fits(page);
 await page.getByRole('button',{name:'Notifications',exact:true}).click();
 const notice=page.locator('.notification-popover');await expect(notice).toBeVisible();
 const box=await notice.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
 await page.getByRole('button',{name:'Notifications',exact:true}).click();
 await page.screenshot({path:info.outputPath('dashboard.png'),fullPage:true});
 await navigate(page,'Patients');await expect(page.getByRole('button',{name:/Open record for/}).first()).toBeVisible();await fits(page);
 await page.getByRole('button',{name:'Register Patient',exact:true}).click();
 await page.getByLabel('Full name *',{exact:true}).fill('Synthetic mobile form');
 await page.getByLabel('Date of birth *',{exact:true}).fill('1990-01-01');await fits(page);
 for(const field of await page.locator('input.field, select.field, textarea.field').all()) {
   if(!await field.isVisible())continue;const bounds=await field.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
 }
 await page.screenshot({path:info.outputPath('registration.png'),fullPage:true});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:/Open record for/}).first().click();await expect(page.getByRole('tab',{name:'Overview',exact:true})).toBeVisible();await fits(page);
 await page.getByRole('tab',{name:'Activity History',exact:true}).click();await fits(page);
 await page.getByRole('button',{name:'Upload Document',exact:true}).click();await expect(page.getByRole('button',{name:'Browse Files'})).toBeVisible();await fits(page);
 await page.screenshot({path:info.outputPath('upload.png'),fullPage:true});
 for(const [name,title] of [['Medical Documents','Medical Document Library'],['User Management','User Management'],['Audit Logs','Audit Logs'],['Settings','Settings']]) {
   await navigate(page,name);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await fits(page);
 }
 const profileInfo=await page.locator('.settings-profile-identity > div').boundingBox();
 expect(profileInfo!.width).toBeGreaterThanOrEqual(120);
 await page.screenshot({path:info.outputPath('settings.png'),fullPage:true});
 await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
 await page.getByRole('button',{name:'Close menu',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Navigation menu'})).toHaveCount(0);
 expect(errors).toEqual([]);
});
