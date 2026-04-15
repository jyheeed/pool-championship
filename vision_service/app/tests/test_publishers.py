from app.publishers.multi_publisher import MultiPublisher, PublisherBinding


class StubPublisher:
    def __init__(self, response: bool):
        self.response = response
        self.calls = 0

    def publish(self, event):
        self.calls += 1
        return self.response


def test_multi_publisher_fails_when_required_fails() -> None:
    required = StubPublisher(False)
    optional = StubPublisher(True)
    publisher = MultiPublisher(
        publishers=[
            PublisherBinding(publisher=required, required=True),
            PublisherBinding(publisher=optional, required=False),
        ]
    )

    ok = publisher.publish({"type": "heartbeat"})
    assert ok is False
    assert required.calls == 1
    assert optional.calls == 1


def test_multi_publisher_succeeds_when_only_optional_fails() -> None:
    required = StubPublisher(True)
    optional = StubPublisher(False)
    publisher = MultiPublisher(
        publishers=[
            PublisherBinding(publisher=required, required=True),
            PublisherBinding(publisher=optional, required=False),
        ]
    )

    ok = publisher.publish({"type": "heartbeat"})
    assert ok is True
