import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0005_branchevent"),
    ]

    operations = [
        migrations.CreateModel(
            name="BranchEventMatch",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("round_num", models.PositiveSmallIntegerField(db_index=True)),
                ("slot", models.PositiveSmallIntegerField()),
                ("label_top", models.CharField(blank=True, max_length=255)),
                ("label_bottom", models.CharField(blank=True, max_length=255)),
                ("score_top", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("score_bottom", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("winner", models.CharField(blank=True, default="", max_length=8)),
                (
                    "event",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="bracket_matches",
                        to="api.branchevent",
                    ),
                ),
            ],
            options={
                "ordering": ["round_num", "slot"],
            },
        ),
        migrations.AddConstraint(
            model_name="brancheventmatch",
            constraint=models.UniqueConstraint(
                fields=("event", "round_num", "slot"),
                name="unique_event_round_slot",
            ),
        ),
    ]
