function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

export async function handler(event) {
  if (event.test === 'alert') {
    console.log('ALERT\t', 'Alert alert');
    return;
  }
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
