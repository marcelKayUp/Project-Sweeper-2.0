"""Object-space symmetry policy, shared by measurement and geometry consumers."""


def selected_symmetries(plan, scope):
    selected=[]
    for item in plan:
        base=item["scope"]
        if item.get("useForGeometry") is not True or not item.get("activeForGeometry") or item.get("status") not in ("assumed","supported"):
            continue
        if scope!=base and not scope.startswith(base+"/"):
            continue
        relative=scope[len(base):].lstrip("/")
        if any(scope==part or relative==part or relative.startswith(part+"/") for part in item.get("exceptions",[])):
            continue
        selected.append(item)
    return selected


def mirror_allowed(plan, scope, plane="XZ"):
    return any(item["type"]=="bilateral" and item.get("plane")==plane for item in selected_symmetries(plan,scope))
