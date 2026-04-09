function parseTemplate(content, data) {
  let parsed = content.replace(/{{(.*?)}}/g, (_, key) => {
    return data[key.trim()] ?? "";
  });

  // 🔥 Convert \n string into actual new lines
  parsed = parsed.replace(/\\n/g, "\n");

  return parsed;
}

module.exports = { parseTemplate };