import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0009_eventregistration"),
    ]

    operations = [
        migrations.CreateModel(
            name="EventWaitlistEntry",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "event",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="waitlist_entries",
                        to="api.branchevent",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="courtly_event_waitlist_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="eventwaitlistentry",
            constraint=models.UniqueConstraint(fields=("event", "user"), name="unique_event_waitlist_per_user"),
        ),
    ]
