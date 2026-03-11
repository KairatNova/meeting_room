"""add room images table

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f607
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b2c3d4e5f607"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "room_images" not in existing_tables:
        op.create_table(
            "room_images",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("room_id", sa.Integer(), nullable=False),
            sa.Column("path", sa.String(length=512), nullable=False),
            sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_room_images_room_id"), "room_images", ["room_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "room_images" in existing_tables:
        indexes = {idx["name"] for idx in inspector.get_indexes("room_images")}
        idx_name = op.f("ix_room_images_room_id")
        if idx_name in indexes:
            op.drop_index(idx_name, table_name="room_images")
        op.drop_table("room_images")
