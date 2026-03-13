"""add room location fields

Revision ID: e1f2a3b4c5d6
Revises: d7e8f9a0b1c2
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rooms", sa.Column("region", sa.String(length=128), nullable=True))
    op.add_column("rooms", sa.Column("city", sa.String(length=128), nullable=True))
    op.add_column("rooms", sa.Column("district", sa.String(length=128), nullable=True))
    op.add_column("rooms", sa.Column("address", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_rooms_region"), "rooms", ["region"], unique=False)
    op.create_index(op.f("ix_rooms_city"), "rooms", ["city"], unique=False)
    op.create_index(op.f("ix_rooms_district"), "rooms", ["district"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_rooms_district"), table_name="rooms")
    op.drop_index(op.f("ix_rooms_city"), table_name="rooms")
    op.drop_index(op.f("ix_rooms_region"), table_name="rooms")
    op.drop_column("rooms", "address")
    op.drop_column("rooms", "district")
    op.drop_column("rooms", "city")
    op.drop_column("rooms", "region")
