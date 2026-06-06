from __future__ import annotations
import unittest
from api.payment_status import PAYMENT_STATUS_CANCELLED, PAYMENT_STATUS_FAILED, PAYMENT_STATUS_PAID, PAYMENT_STATUS_PENDING, PAYMENT_STATUS_REFUNDED, PaymentStatusError, assert_transition_allowed, normalize_payment_status

class NormalizePaymentStatusTests(unittest.TestCase):

    def test_slug_paid(self):
        self.assertEqual(normalize_payment_status('paid'), PAYMENT_STATUS_PAID)

    def test_canonical_round_trip(self):
        self.assertEqual(normalize_payment_status(PAYMENT_STATUS_PENDING), PAYMENT_STATUS_PENDING)

    def test_unknown(self):
        self.assertIsNone(normalize_payment_status('Частично'))
        self.assertIsNone(normalize_payment_status(''))

class TransitionTests(unittest.TestCase):

    def test_pending_to_paid(self):
        c, n = assert_transition_allowed(PAYMENT_STATUS_PENDING, 'paid')
        self.assertEqual(c, PAYMENT_STATUS_PENDING)
        self.assertEqual(n, PAYMENT_STATUS_PAID)

    def test_paid_to_refund(self):
        _, n = assert_transition_allowed(PAYMENT_STATUS_PAID, PAYMENT_STATUS_REFUNDED)
        self.assertEqual(n, PAYMENT_STATUS_REFUNDED)

    def test_same_status_noop(self):
        c, n = assert_transition_allowed(PAYMENT_STATUS_PENDING, PAYMENT_STATUS_PENDING)
        self.assertEqual(c, n)

    def test_rejects_paid_to_failed(self):
        with self.assertRaises(PaymentStatusError):
            assert_transition_allowed(PAYMENT_STATUS_PAID, PAYMENT_STATUS_FAILED)

    def test_rejects_refund_to_any(self):
        with self.assertRaises(PaymentStatusError):
            assert_transition_allowed(PAYMENT_STATUS_REFUNDED, PAYMENT_STATUS_PENDING)

    def test_rejects_cancelled_to_pending(self):
        with self.assertRaises(PaymentStatusError):
            assert_transition_allowed(PAYMENT_STATUS_CANCELLED, PAYMENT_STATUS_PENDING)

    def test_unknown_target(self):
        with self.assertRaises(PaymentStatusError):
            assert_transition_allowed(PAYMENT_STATUS_PENDING, 'Частично')

    def test_unknown_current(self):
        with self.assertRaises(PaymentStatusError):
            assert_transition_allowed('Частично', PAYMENT_STATUS_PAID)
if __name__ == '__main__':
    unittest.main()
