import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0014_perf_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="trainer_amount_rub",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text="Начисление тренеру по этому платежу (руб., целое).",
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="session_outcome",
            field=models.CharField(
                blank=True,
                choices=[
                    ("pending", "pending"),
                    ("completed", "completed"),
                    ("no_show", "no_show"),
                    ("rescheduled", "rescheduled"),
                ],
                default="pending",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="trainer_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="courtly_trainer_bookings",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(fields=["trainer_user", "date"], name="booking_trainer_user_date_idx"),
        ),
        migrations.CreateModel(
            name="TrainerAvailabilityWindow",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("weekday", models.PositiveSmallIntegerField(help_text="0=пн … 6=вс (как date.weekday() в Python).")),
                ("start_min", models.PositiveIntegerField()),
                ("end_min", models.PositiveIntegerField()),
                ("note", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="trainer_availability_windows",
                        to="api.branch",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="trainer_availability_windows",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["branch_id", "weekday", "start_min", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="traineravailabilitywindow",
            index=models.Index(fields=["branch", "user", "weekday"], name="trn_avail_branch_user_wd"),
        ),
    ]
