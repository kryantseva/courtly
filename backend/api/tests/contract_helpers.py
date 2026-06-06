from __future__ import annotations
from typing import Any

def assert_required_types(obj: dict[str, Any], schema: dict[str, type | tuple[type, ...]]) -> None:
    for key, expected in schema.items():
        assert key in obj, f'Отсутствует обязательное поле «{key}»'
        val = obj[key]
        if isinstance(expected, tuple):
            assert isinstance(val, expected), f'Поле «{key}»: ожидался тип {expected}, получено {type(val)}'
        else:
            assert isinstance(val, expected), f'Поле «{key}»: ожидался {expected}, получено {type(val)}'

def validation_error_fields(data: dict[str, Any]) -> dict[str, Any]:
    err = data.get('error')
    if isinstance(err, dict) and isinstance(err.get('details'), dict):
        return err['details']
    return data

def assert_validation_field(data: dict[str, Any], field: str) -> None:
    assert field in validation_error_fields(data), f'Ожидалось поле ошибки «{field}» в {data!r}'

def unwrap_envelope(data: dict[str, Any]) -> dict[str, Any] | list[Any]:
    inner = data.get('data')
    if isinstance(inner, dict):
        out = {**inner}
        for k, v in data.items():
            if k in ('data', 'meta', 'error'):
                continue
            out.setdefault(k, v)
        return out
    if isinstance(inner, list):
        return inner
    return data
