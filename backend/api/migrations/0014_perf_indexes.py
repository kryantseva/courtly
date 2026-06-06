from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0013_passwordresettoken"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(fields=["branch", "date", "start_min"], name="booking_branch_date_start_idx"),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(fields=["branch", "room", "date", "start_min"], name="booking_branch_room_day_idx"),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(fields=["client_ref", "date"], name="booking_clientref_date_idx"),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(fields=["status"], name="booking_status_idx"),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(fields=["kind"], name="booking_kind_idx"),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(fields=["status"], name="payment_status_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["branch_id", "-created_at"], name="audit_branch_created_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["user", "-created_at"], name="audit_user_created_idx"),
        ),
        migrations.AddIndex(
            model_name="idempotencyrecord",
            index=models.Index(fields=["endpoint", "-created_at"], name="idem_endpoint_created_idx"),
        ),
        migrations.AddIndex(
            model_name="idempotencyrecord",
            index=models.Index(fields=["key", "-created_at"], name="idem_key_created_idx"),
        ),
    ]
