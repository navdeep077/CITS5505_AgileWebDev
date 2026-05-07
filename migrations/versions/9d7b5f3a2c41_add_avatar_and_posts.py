"""add avatar and posts

Revision ID: 9d7b5f3a2c41
Revises: 140c00c4b540
Create Date: 2026-05-06 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '9d7b5f3a2c41'
down_revision = '140c00c4b540'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('avatar', sa.String(length=255), nullable=True))

    op.create_table(
        'post',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('shop', sa.String(length=120), nullable=True),
        sa.Column('image', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('post')

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('avatar')
