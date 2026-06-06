import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies: list = []

    operations = [
        migrations.CreateModel(
            name="Branch",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="Room",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("label", models.CharField(max_length=255)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rooms",
                        to="api.branch",
                    ),
                ),
            ],
            options={
                "ordering": ["branch_id", "sort_order", "id"],
            },
        ),
        migrations.CreateModel(
            name="Booking",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("date", models.DateField(db_index=True)),
                ("start_min", models.PositiveIntegerField()),
                ("end_min", models.PositiveIntegerField()),
                ("client_name", models.CharField(max_length=255)),
                ("phone", models.CharField(blank=True, max_length=64)),
                ("service", models.CharField(blank=True, max_length=255)),
                ("tone", models.CharField(default="mint", max_length=32)),
                ("paid", models.BooleanField(default=False)),
                ("confirmed", models.BooleanField(default=False)),
                ("client_ref", models.CharField(blank=True, max_length=64, null=True)),
                ("trainer", models.CharField(blank=True, max_length=255)),
                ("trainer_staff_id", models.CharField(blank=True, max_length=64, null=True)),
                ("status", models.CharField(blank=True, max_length=64)),
                ("kind", models.CharField(blank=True, max_length=32)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="bookings",
                        to="api.branch",
                    ),
                ),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="bookings",
                        to="api.room",
                    ),
                ),
            ],
            options={
                "ordering": ["date", "start_min", "id"],
            },
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("amount_label", models.CharField(max_length=64)),
                ("status", models.CharField(max_length=64)),
                ("method", models.CharField(blank=True, max_length=64)),
                ("booking_label", models.CharField(blank=True, max_length=255)),
                (
                    "booking",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to="api.booking",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
            },
        ),
    ]
