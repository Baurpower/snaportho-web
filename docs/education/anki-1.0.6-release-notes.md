# SnapOrtho Anki add-on 1.0.6

## Windows activation fix

Windows users can now securely activate the SnapOrtho add-on. Device credentials are stored in Windows Credential Manager under the current Windows account. macOS continues to use Keychain. SnapOrtho does not store the device token in Anki configuration or its local draft database.

Activation now checks native credential storage before opening the browser, verifies the saved credential before reporting success, and safely restarts with a new link code if an approved token cannot be persisted. Newly issued tokens remain provisional until the add-on confirms successful storage.

## Upgrade

Install `snaportho-1.0.6.ankiaddon` from Anki’s add-on manager and restart Anki. Existing macOS credentials retain the same namespace and do not need to be relinked.

## Support

If activation still fails, open **Tools → SnapOrtho → Safe Diagnostics** and share that redacted output with support. Diagnostics never contain the device token, link code, card content, or Anki profile name.

Linux secure credential storage is not yet supported; the add-on now reports that before browser approval instead of consuming a link code.
