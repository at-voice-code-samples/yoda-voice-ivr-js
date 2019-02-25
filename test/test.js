import {Selector, RequestLogger} from 'testcafe';

const url = "http://127.0.0.1:3088";

const logger = RequestLogger({ url, method: 'get' }, {
    logResponseHeaders: true,
    logResponseBody:    true
});

fixture `Initial Test` 
    .page(url)
    .requestHooks(logger);

test('Page Loads', async t => {

    await t 
        .expect(logger.contains(r => r.response.statusCode === 200)).ok();
});