function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

exports.handler = async function(event) {
  if (event.test === 'console') {
    console.error(event);
    console.error('Plain text error');
    return;
  }

  if (event.test === 'exception') {
    return x + 10;
  }

  if (event.test === 'timeout') {
    await sleep(10);
    return;
  }
}
