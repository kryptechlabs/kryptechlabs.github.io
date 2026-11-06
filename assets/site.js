/* KrypTech Labs: menu, copy buttons, contact form. No dependencies. */
(function () {
  'use strict';

  // ---- Mobile menu ----
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Close' : 'Menu';
    });
  }

  // ---- Copy buttons: <button data-copy="text"> ----
  function copyText(text, done, failed) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, failed);
    } else {
      failed();
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      copyText(b.getAttribute('data-copy'), function () {
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = label; }, 1800);
      }, function () {
        // Clipboard refused: select the visible value so the visitor can copy it by hand.
        var target = document.getElementById(b.getAttribute('data-copy-target') || '');
        if (target) {
          var range = document.createRange();
          range.selectNodeContents(target);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        b.textContent = 'Select and copy';
        setTimeout(function () { b.textContent = label; }, 2400);
      });
    });
  });

  // ---- Contact form ----
  // Messages are delivered to the KrypTech inbox by Web3Forms (https://web3forms.com).
  // The access key is set in build.py (FORM_ACCESS_KEY) and lands on the form as
  // data-access-key. Until a key is set the form never claims a message was sent:
  // it hands the visitor their message to copy and email instead.
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var form = document.getElementById('contact-form');
  if (!form) return;

  var result = document.getElementById('form-result');
  var submit = form.querySelector('[type="submit"]');
  var inbox = form.getAttribute('data-email');

  function mobileOk(v) {
    if (v === '') return true; // optional
    if (!/^[+()\d\s-]+$/.test(v)) return false;
    var digits = v.replace(/\D/g, '').length;
    return digits >= 10 && digits <= 15;
  }

  var rules = {
    'cf-first': { msg: 'Enter your first name.' },
    'cf-last': { msg: 'Enter your last name.' },
    'cf-email': { msg: 'Enter an email address we can reply to, like name@company.com.' },
    'cf-mobile': { msg: 'Enter a mobile number with 10 to 15 digits, like +91 98765 43210, or leave it empty.', test: mobileOk },
    'cf-message': { msg: 'Write a short message about what you need.' }
  };

  function isValid(input) {
    var rule = rules[input.id];
    var v = input.value.trim();
    if (rule.test) return rule.test(v);
    return v !== '' && input.checkValidity();
  }

  function setError(input, message) {
    var err = document.getElementById(input.id + '-err');
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (err) { err.textContent = message; err.hidden = false; }
    } else {
      input.removeAttribute('aria-invalid');
      if (err) { err.textContent = ''; err.hidden = true; }
    }
  }

  function validate() {
    var first = null;
    Object.keys(rules).forEach(function (id) {
      var input = document.getElementById(id);
      var ok = isValid(input);
      setError(input, ok ? '' : rules[id].msg);
      if (!ok && !first) first = input;
    });
    if (first) first.focus();
    return !first;
  }

  Object.keys(rules).forEach(function (id) {
    var input = document.getElementById(id);
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true' && isValid(input)) setError(input, '');
    });
  });

  function val(id) { return document.getElementById(id).value.trim(); }

  function el(tag, text, attrs) {
    var node = document.createElement(tag);
    if (text) node.textContent = text;
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function show(nodes) {
    result.innerHTML = '';
    nodes.forEach(function (n) { result.appendChild(n); });
    result.hidden = false;
    result.focus();
  }

  function sending(on) {
    submit.disabled = on;
    submit.textContent = on ? 'Sending' : 'Send message';
  }

  function notSent() {
    show([
      el('strong', 'Your message was not sent.'),
      el('p', 'Something went wrong on our side. Try again in a few minutes, or email us at ' + inbox + '.')
    ]);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var data = {
      first_name: val('cf-first'),
      last_name: val('cf-last'),
      email: val('cf-email'),
      mobile: val('cf-mobile'),
      message: val('cf-message')
    };
    var name = data.first_name + ' ' + data.last_name;

    // Spam trap: real visitors never see or tick this box.
    if (document.getElementById('cf-botcheck').checked) {
      form.reset();
      show([el('strong', 'Message sent.')]);
      return;
    }

    var key = form.getAttribute('data-access-key');
    if (key) {
      sending(true);
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: key,
          subject: 'New enquiry from ' + name + ' (kryptechlabs website)',
          from_name: 'KrypTech Labs website',
          name: name,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,          // becomes the reply-to address
          mobile: data.mobile || 'Not given',
          message: data.message,
          botcheck: false
        })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok || !json.success) throw new Error('Not sent');
          form.reset();
          show([
            el('strong', 'Message sent.'),
            el('p', 'Thanks, ' + data.first_name + '. We’ll reply to ' + data.email + '.')
          ]);
        });
      }).catch(notSent).then(function () { sending(false); });
      return;
    }

    var body = [
      'Name: ' + name,
      'Email: ' + data.email,
      'Mobile: ' + (data.mobile || 'Not given'),
      '',
      data.message
    ].join('\n');

    var ta = el('textarea', '', { id: 'cf-composed', readonly: 'readonly', 'aria-label': 'Your message, ready to copy' });
    ta.value = body;
    var copy = el('button', 'Copy message', { type: 'button', 'class': 'btn btn--small' });
    copy.addEventListener('click', function () {
      copyText(body, function () {
        copy.textContent = 'Copied';
      }, function () {
        ta.focus();
        ta.select();
        copy.textContent = 'Selected. Press copy.';
      });
    });
    show([
      el('strong', 'This form is not connected to an inbox yet.'),
      el('p', 'Nothing was sent. Copy your message below and email it to ' + inbox + '.'),
      ta,
      copy
    ]);
  });
})();
