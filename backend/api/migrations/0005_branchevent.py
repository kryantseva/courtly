import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0004_branch_connection_code"),
    ]

    operations = [
        migrations.CreateModel(
            name="BranchEvent",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("tournament", "tournament"),
                            ("open_day", "open_day"),
                            ("camp", "camp"),
                            ("maintenance_block", "maintenance_block"),
                            ("corporate", "corporate"),
                        ],
                        default="tournament",
                        max_length=32,
                    ),
                ),
                ("start_date", models.DateField(db_index=True)),
                ("end_date", models.DateField(db_index=True)),
                ("venue", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(default="Черновик", max_length=128)),
                ("event_format", models.CharField(blank=True, max_length=255)),
                ("max_participants", models.PositiveIntegerField(blank=True, null=True)),
                ("registered", models.PositiveIntegerField(default=0)),
                ("notes", models.TextField(blank=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="api.branch",
                    ),
                ),
            ],
            options={
                "ordering": ["start_date", "id"],
            },
        ),
    ]
