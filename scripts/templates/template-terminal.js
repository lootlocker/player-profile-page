/*
  Terminal Template
  Needs to go together with the CSS in template-terminal.css.
  Copy this file into scripts/custom.js.
*/
(function () {
  'use strict';

  // Only activate on the profile page (identified by the settings elements).
  if (!document.getElementById('settingsPlayerName')) return;

  // ── Inject CLI panel ────────────────────────────────────────────────────────

  function injectCLI() {
    var appView = document.getElementById('appView');
    if (!appView) return;

    var panel = document.createElement('article');
    panel.className = 'card term-cli-card';
    panel.innerHTML =
      '<div class="section-title-row">' +
        '<h3>Terminal</h3>' +
      '</div>' +
      '<div id="termOutput" class="term-cli-output" role="log" aria-label="Terminal output" aria-live="polite"></div>' +
      '<form id="termForm" class="term-cli-prompt" autocomplete="off" spellcheck="false">' +
        '<span class="term-cli-ps1" aria-hidden="true">&gt;&nbsp;</span>' +
        '<input id="termInput" class="term-cli-input" type="text" aria-label="Enter command" placeholder="help" />' +
      '</form>';

    appView.appendChild(panel);

    document.getElementById('termForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = document.getElementById('termInput').value.trim();
      document.getElementById('termInput').value = '';
      if (!raw) return;
      echo(raw);
      dispatch(raw);
    });

    print('System ready. Type <span class="term-kw">help</span> for available commands.', 'info');
  }

  // ── Output helpers ──────────────────────────────────────────────────────────

  function print(html, type) {
    var out = document.getElementById('termOutput');
    if (!out) return;
    var el = document.createElement('p');
    el.className = 'term-line' + (type ? ' term-line--' + type : '');
    el.innerHTML = html;
    out.appendChild(el);
    out.scrollTop = out.scrollHeight;
  }

  function echo(text) {
    print('&gt;&nbsp;' + esc(text), 'cmd');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Command dispatch ────────────────────────────────────────────────────────

  function dispatch(raw) {
    // Tokenise: respect double/single-quoted strings
    var tokens = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    var cmd = (tokens[0] || '').toLowerCase();
    var args = tokens.slice(1).map(function (t) {
      return t.replace(/^["']|["']$/g, '');
    });

    var commands = {
      'help':           cmdHelp,
      'whoami':         cmdWhoami,
      'clear':          cmdClear,
      'set-name':       function () { cmdSetName(args.join(' ')); },
      'reset-password': cmdResetPassword,
    };

    if (commands[cmd]) {
      commands[cmd]();
    } else {
      print(
        'Unknown command: <span class="term-err">' + esc(cmd) + '</span>. ' +
        'Type <span class="term-kw">help</span>.',
        'error'
      );
    }
  }

  // ── Commands ────────────────────────────────────────────────────────────────

  function cmdHelp() {
    [
      '<span class="term-kw">help</span>                        show this message',
      '<span class="term-kw">whoami</span>                      display your profile info',
      '<span class="term-kw">set-name</span> <span class="term-arg">&lt;name&gt;</span>           set your player name',
      '<span class="term-kw">reset-password</span>              send a password reset email',
      '<span class="term-kw">clear</span>                       clear this output',
    ].forEach(function (l) { print(l, 'info'); });
  }

  function cmdWhoami() {
    var fields = [
      ['name',      'settingsPlayerName'],
      ['uid',       'settingsPublicUid'],
      ['joined',    'settingsJoinedAt'],
      ['last_seen', 'settingsLastSeenAt'],
      ['email',     'settingsEmail'],
    ];
    fields.forEach(function (pair) {
      var el = document.getElementById(pair[1]);
      var val = el ? el.textContent.trim() : '-';
      print(
        '<span class="term-key">' + pair[0] + '</span>' +
        '<span class="term-eq"> = </span>' +
        '<span class="term-val">"' + esc(val) + '"</span>',
        'info'
      );
    });
  }

  function cmdClear() {
    var out = document.getElementById('termOutput');
    if (out) out.innerHTML = '';
  }

  function cmdSetName(name) {
    name = name.trim();
    if (!name) {
      print(
        'Usage: <span class="term-kw">set-name</span> <span class="term-arg">&lt;name&gt;</span>',
        'error'
      );
      return;
    }

    var editBtn    = document.getElementById('playerNameEditButton');
    var nameInput  = document.getElementById('playerNameInput');
    var nameForm   = document.getElementById('playerNameForm');
    var nameStatus = document.getElementById('playerNameStatus');
    var editRow    = document.getElementById('playerNameEditRow');
    var appView    = document.getElementById('appView');

    if (!editBtn || !nameInput || !nameForm || !editRow) {
      print('Error: name form unavailable.', 'error');
      return;
    }

    print('Setting name\u2026', 'info');

    // Visually suppress the inline edit row while we drive it from the CLI.
    if (appView) appView.classList.add('term-cli-submitting');

    var settled = false;

    function settle(html, type) {
      if (settled) return;
      settled = true;
      successObs.disconnect();
      errorObs.disconnect();
      if (appView) appView.classList.remove('term-cli-submitting');
      print(html, type);
    }

    // Success signal: handlePlayerNameCancel() re-adds 'hidden' to the edit row.
    var successObs = new MutationObserver(function () {
      if (editRow.classList.contains('hidden')) {
        var cur = document.getElementById('settingsPlayerName');
        settle(
          'OK \u2014 name set to <span class="term-val">"' +
          esc(cur ? cur.textContent.trim() : name) + '"</span>',
          'info'
        );
      }
    });
    successObs.observe(editRow, { attributes: true, attributeFilter: ['class'] });

    // Error signal: showPlayerNameStatus() adds notice--error to nameStatus.
    var errorObs = new MutationObserver(function () {
      var txt = nameStatus ? nameStatus.textContent.trim() : '';
      if (txt && nameStatus.classList.contains('notice--error')) {
        settle('<span class="term-err">' + esc(txt) + '</span>', 'error');
      }
    });
    if (nameStatus) {
      errorObs.observe(nameStatus, {
        childList: true, characterData: true, subtree: true,
        attributes: true, attributeFilter: ['class'],
      });
    }

    setTimeout(function () {
      settle('<span class="term-err">Timed out waiting for response.</span>', 'error');
    }, 8000);

    // Drive the existing form: open edit row → fill input → submit.
    editBtn.click();
    nameInput.value = name;
    nameForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  function cmdResetPassword() {
    var resetForm   = document.getElementById('passwordResetForm');
    var resetStatus = document.getElementById('passwordResetStatus');

    if (!resetForm) {
      print('Error: password reset form unavailable.', 'error');
      return;
    }

    print('Sending reset email\u2026', 'info');

    var settled = false;

    function settle(html, type) {
      if (settled) return;
      settled = true;
      obs.disconnect();
      print(html, type);
    }

    var obs = new MutationObserver(function () {
      var txt = resetStatus ? resetStatus.textContent.trim() : '';
      if (!txt || resetStatus.classList.contains('hidden')) return;
      if (resetStatus.classList.contains('notice--error')) {
        settle('<span class="term-err">' + esc(txt) + '</span>', 'error');
      } else if (resetStatus.classList.contains('notice--success')) {
        settle('OK \u2014 <span class="term-val">check your inbox.</span>', 'info');
      }
    });
    if (resetStatus) {
      obs.observe(resetStatus, {
        childList: true, characterData: true, subtree: true,
        attributes: true, attributeFilter: ['class'],
      });
    }

    setTimeout(function () {
      settle('<span class="term-err">Timed out.</span>', 'error');
    }, 10000);

    resetForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  // ── Boot ────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCLI);
  } else {
    injectCLI();
  }

}());
