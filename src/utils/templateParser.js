function parseTemplate(content, data) {
  return content.replace(/{{(.*?)}}/g, (_, key) => {
    return data[key.trim()] ?? "";
  });
}

module.exports = { parseTemplate };