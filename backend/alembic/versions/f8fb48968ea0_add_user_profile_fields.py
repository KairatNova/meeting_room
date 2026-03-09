"""add user profile fields

Revision ID: f8fb48968ea0
Revises: 453c63233ca0
Create Date: 2026-03-05 09:33:13.608226

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8fb48968ea0"
down_revision: Union[str, None] = "453c63233ca0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("gender", sa.String(length=16), nullable=True))
    op.add_column("users", sa.Column("citizenship", sa.String(length=64), nullable=True))
    op.add_column(
        "users",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "updated_at")
    op.drop_column("users", "citizenship")
    op.drop_column("users", "gender")
    op.drop_column("users", "birth_date")
    op.drop_column("users", "phone")
    op.drop_column("users", "display_name")
