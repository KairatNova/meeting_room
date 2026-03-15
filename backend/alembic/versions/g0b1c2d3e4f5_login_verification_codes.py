"""Telegram (users.telegram_username, telegram_chat_id, telegram_pending_links) + login_verification_codes

Revision ID: g0b1c2d3e4f5
Revises: e1f2a3b4c5d6
Create Date: 2026-03-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g0b1c2d3e4f5"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Telegram: поля в users (из отсутствующей f9a0b1c2d3e4)
    op.add_column(
        "users",
        sa.Column("telegram_username", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True),
    )
    op.create_table(
        "telegram_pending_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_telegram_pending_links_token", "telegram_pending_links", ["token"], unique=True)

    # Коды входа (2FA)
    op.create_table(
        "login_verification_codes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_login_verification_codes_user_id", "login_verification_codes", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_login_verification_codes_user_id", table_name="login_verification_codes")
    op.drop_table("login_verification_codes")
    op.drop_index("ix_telegram_pending_links_token", table_name="telegram_pending_links")
    op.drop_table("telegram_pending_links")
    op.drop_column("users", "telegram_chat_id")
    op.drop_column("users", "telegram_username")
