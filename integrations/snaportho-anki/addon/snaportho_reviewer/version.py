ADDON_VERSION = "1.0.3"


def addon_version_at_least(client, minimum):
    """Compare dotted add-on versions. Missing minimum allows everyone; missing client fails a floor."""
    if not minimum:
        return True
    if not client:
        return False

    def parts(value):
        out = []
        for piece in str(value).split("."):
            try:
                out.append(int(piece))
            except (TypeError, ValueError):
                out.append(0)
        return out

    left, right = parts(client), parts(minimum)
    size = max(len(left), len(right))
    left.extend([0] * (size - len(left)))
    right.extend([0] * (size - len(right)))
    return left >= right
