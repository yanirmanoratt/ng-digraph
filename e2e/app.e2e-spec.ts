import { D3wrapPage } from './app.po';

describe('d3wrap App', () => {
  let page: D3wrapPage;

  beforeEach(() => {
    page = new D3wrapPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
