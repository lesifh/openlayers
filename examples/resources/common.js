(function() {

  function compress(json) {
    return LZString.compressToBase64(JSON.stringify(json))
      .replace(/\+/g, `-`)
      .replace(/\//g, `_`)
      .replace(/=+$/, ``);
  }

  function fetchResource(resource) {
    return new Promise((resolve, reject) => {
      const isImage = /\.(png|jpe?g|gif|tiff)$/.test(resource);
      const xhr = new XMLHttpRequest();
      xhr.open('GET', resource);
      if (isImage) {
        xhr.responseType = 'blob';
      } else {
        xhr.responseType = 'text';
      }
      xhr.addEventListener('load', () => {
        if (isImage) {
          const a = new FileReader();
          a.addEventListener('load', e => {
            resolve ({
              isBinary: true,
              content: e.target.result
            })
          });
          a.readAsDataURL(xhr.response);
        } else {
          resolve ({
            content: xhr.response
          })
        }
      });
      xhr.addEventListener('error', reject);
      xhr.send();
    })
  }

  const codepenButton = document.getElementById('codepen-button');
  if (codepenButton) {
    const form = document.getElementById('codepen-form');
    codepenButton.href = form.action;
    codepenButton.addEventListener('click', function(event) {
      event.preventDefault();
      const html = document.getElementById('example-html-source').innerText;
      const js = document.getElementById('example-js-source').innerText;
      const workerContainer = document.getElementById('example-worker-source');
      const worker = workerContainer ? workerContainer.innerText : undefined;
      const pkgJson = document.getElementById('example-pkg-source').innerText;

      const unique = new Set();
      const localResources = (js.match(/'data\/[^']*/g) || [])
        .concat(js.match(/'resources\/[^']*/g) || [])
        .map(f => f.slice(1))
        .filter(f => unique.has(f) ? false : unique.add(f));

      const promises = localResources.map(resource => fetchResource(resource));

      Promise.all(promises)
        .then(results => {
          const files = {
            'index.html': {
              content: html
            },
            'main.js': {
              content: js
            },
            "package.json": {
              content: pkgJson
            },
            'sandbox.config.json': {
              content: '{"template": "parcel"}'
            }
          };
          if (worker) {
            files['worker.js'] = {
              content: worker
            }
          }
          const data = {
            files: files
          };

          for (let i = 0; i < localResources.length; i++) {
            data.files[localResources[i]] = results[i];
          }

          form.parameters.value = compress(data);
          form.submit();
        });
    });
  }
})();
