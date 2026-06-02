"""add post view tracking

Revision ID: fix_post_view
Revises: e8940b49ee9f
Create Date: 2026-06-02

"""
from alembic import op
import sqlalchemy as sa


revision = 'fix_post_view'
down_revision = 'e8940b49ee9f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'post_view',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['post.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('post_id', 'user_id', name='unique_post_view')
    )


def downgrade():
    op.drop_table('post_view')
