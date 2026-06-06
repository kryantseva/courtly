from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0007_branchevent_room"),
    ]

    operations = [
        migrations.AddField(
            model_name="branchevent",
            name="journal_block_end_min",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="branchevent",
            name="journal_block_start_min",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
