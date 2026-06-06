from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0003_branchmembership"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="connection_code",
            field=models.CharField(
                blank=True,
                help_text="Код подключения для пользователей (уникален, регистр не важен).",
                max_length=64,
                null=True,
                unique=True,
            ),
        ),
    ]
