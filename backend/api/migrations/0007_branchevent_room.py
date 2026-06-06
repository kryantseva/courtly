import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_brancheventmatch"),
    ]

    operations = [
        migrations.AddField(
            model_name="branchevent",
            name="room",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="events",
                to="api.room",
            ),
        ),
    ]
